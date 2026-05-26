from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta, timezone

import football_api
import lower_thirds as lower_thirds_module
import experts as experts_module


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection (kept intact even if not heavily used)
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Jandia Arena TV Dashboard")
api_router = APIRouter(prefix="/api")


# ---------- Models ----------
class Team(BaseModel):
    code: str          # ISO country code, e.g. "DE"
    name: str          # Display name in German
    short: str         # 3-letter code, e.g. "GER"


class Match(BaseModel):
    id: str
    stage: str                       # e.g., "Gruppe A", "Achtelfinale"
    venue: str
    kickoff: str                     # ISO datetime
    status: str                      # "scheduled" | "live" | "finished"
    minute: Optional[int] = None     # only for live
    home: Team
    away: Team
    home_score: Optional[int] = None
    away_score: Optional[int] = None


# ---------- Demo data generator ----------
# Anchor 'today' to a configurable date so the TV behaves as if it were that day.
# Priority:
#   1) Runtime override stored in MongoDB (`runtime_settings.simulate_date`)
#      - empty string ""  -> live mode (no simulation, overrides env)
#      - "YYYY-MM-DD"     -> simulated date
#   2) Fallback to env var `SIMULATE_DATE` (bootstrap default)
# Time-of-day stays real so the clock keeps ticking normally.
_runtime_state: dict = {
    # None  -> no runtime override, use env
    # ""    -> explicit live mode
    # "YYYY-MM-DD" -> simulated date
    "simulate_date_override": None,
}


def _effective_simulate_date() -> str:
    """Return the simulate-date string that should currently be used ('' = live)."""
    override = _runtime_state.get("simulate_date_override")
    if override is not None:
        return override
    return os.environ.get("SIMULATE_DATE", "").strip()


def _now() -> datetime:
    simulated = _effective_simulate_date()
    real_now = datetime.now(timezone.utc)
    if simulated:
        try:
            d = datetime.strptime(simulated, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            return d.replace(
                hour=real_now.hour,
                minute=real_now.minute,
                second=real_now.second,
                microsecond=real_now.microsecond,
            )
        except ValueError:
            pass
    return real_now


def _today_at(hour: int, minute: int = 0) -> datetime:
    base = _now().replace(hour=hour, minute=minute, second=0, microsecond=0)
    return base


TEAMS = {
    "GER": Team(code="DE", name="Deutschland", short="GER"),
    "ESP": Team(code="ES", name="Spanien", short="ESP"),
    "FRA": Team(code="FR", name="Frankreich", short="FRA"),
    "BRA": Team(code="BR", name="Brasilien", short="BRA"),
    "ARG": Team(code="AR", name="Argentinien", short="ARG"),
    "ENG": Team(code="GB-ENG", name="England", short="ENG"),
    "POR": Team(code="PT", name="Portugal", short="POR"),
    "NED": Team(code="NL", name="Niederlande", short="NED"),
    "ITA": Team(code="IT", name="Italien", short="ITA"),
    "BEL": Team(code="BE", name="Belgien", short="BEL"),
    "CRO": Team(code="HR", name="Kroatien", short="CRO"),
    "URU": Team(code="UY", name="Uruguay", short="URU"),
    "MEX": Team(code="MX", name="Mexiko", short="MEX"),
    "USA": Team(code="US", name="USA", short="USA"),
    "JPN": Team(code="JP", name="Japan", short="JPN"),
    "MAR": Team(code="MA", name="Marokko", short="MAR"),
}


def _build_matches() -> List[Match]:
    """Build a schedule anchored to *today* so demos always feel current."""
    now = _now()

    schedule = [
        # FINISHED earlier today (relative offsets so always show as finished)
        {
            "id": "m1", "stage": "Gruppe A", "venue": "Lusail Stadium",
            "kickoff": now - timedelta(hours=4, minutes=30), "home": "GER", "away": "JPN",
            "home_score": 3, "away_score": 1,
        },
        {
            "id": "m2", "stage": "Gruppe B", "venue": "Al Bayt Stadium",
            "kickoff": now - timedelta(hours=2, minutes=45), "home": "BRA", "away": "MEX",
            "home_score": 2, "away_score": 0,
        },
        # LIVE now (offsets relative to now). m3 is in first half, m4 is in halftime window.
        {
            "id": "m3", "stage": "Gruppe C", "venue": "Education City",
            "kickoff": now - timedelta(minutes=37), "home": "ESP", "away": "POR",
            "home_score": 1, "away_score": 1,
        },
        {
            "id": "m4", "stage": "Gruppe D", "venue": "Stadium 974",
            "kickoff": now - timedelta(minutes=50), "home": "FRA", "away": "ITA",
            "home_score": 2, "away_score": 1,
        },
        # NEXT / Upcoming today
        {
            "id": "m5", "stage": "Achtelfinale", "venue": "Khalifa International",
            "kickoff": now + timedelta(minutes=18), "home": "ARG", "away": "NED",
        },
        {
            "id": "m6", "stage": "Achtelfinale", "venue": "Al Janoub Stadium",
            "kickoff": now + timedelta(hours=2, minutes=30), "home": "ENG", "away": "BEL",
        },
        {
            "id": "m7", "stage": "Achtelfinale", "venue": "Ahmad bin Ali",
            "kickoff": now + timedelta(hours=5, minutes=0), "home": "CRO", "away": "MAR",
        },
        {
            "id": "m8", "stage": "Achtelfinale", "venue": "Al Thumama",
            "kickoff": now + timedelta(hours=7, minutes=30), "home": "URU", "away": "USA",
        },
        # TOMORROW – Viertelfinale
        {
            "id": "t1", "stage": "Viertelfinale", "venue": "Lusail Stadium",
            "kickoff": now + timedelta(days=1, hours=-2), "home": "GER", "away": "ESP",
        },
        {
            "id": "t2", "stage": "Viertelfinale", "venue": "Al Bayt Stadium",
            "kickoff": now + timedelta(days=1, hours=1), "home": "FRA", "away": "POR",
        },
        {
            "id": "t3", "stage": "Viertelfinale", "venue": "Education City",
            "kickoff": now + timedelta(days=1, hours=4), "home": "BRA", "away": "ARG",
        },
        {
            "id": "t4", "stage": "Viertelfinale", "venue": "Stadium 974",
            "kickoff": now + timedelta(days=1, hours=6, minutes=30), "home": "ENG", "away": "NED",
        },
        # Day +2 – Halbfinale prep / Achtelfinale Tag 2
        {
            "id": "d2a", "stage": "Achtelfinale", "venue": "Lusail Stadium",
            "kickoff": now + timedelta(days=2, hours=-1), "home": "CRO", "away": "JPN",
        },
        {
            "id": "d2b", "stage": "Achtelfinale", "venue": "Al Bayt Stadium",
            "kickoff": now + timedelta(days=2, hours=2), "home": "MAR", "away": "MEX",
        },
        # Day +3 – Halbfinale
        {
            "id": "d3a", "stage": "Halbfinale", "venue": "Lusail Stadium",
            "kickoff": now + timedelta(days=3, hours=0), "home": "GER", "away": "FRA",
        },
        {
            "id": "d3b", "stage": "Halbfinale", "venue": "Al Bayt Stadium",
            "kickoff": now + timedelta(days=3, hours=3), "home": "BRA", "away": "ENG",
        },
        # Day +4 – Ruhetag (intentionally empty to demo "Spielfrei")
        # Day +5 – Spiel um Platz 3
        {
            "id": "d5", "stage": "Spiel um Platz 3", "venue": "Khalifa International",
            "kickoff": now + timedelta(days=5, hours=2), "home": "FRA", "away": "BRA",
        },
        # Day +6 – Finale
        {
            "id": "d6", "stage": "Finale", "venue": "Lusail Stadium",
            "kickoff": now + timedelta(days=6, hours=4), "home": "GER", "away": "ENG",
        },
    ]

    matches: List[Match] = []
    for s in schedule:
        kickoff: datetime = s["kickoff"]
        delta_min = (now - kickoff).total_seconds() / 60.0

        if "home_score" in s and delta_min > 95:
            status = "finished"
            minute = None
            home_score = s["home_score"]
            away_score = s["away_score"]
        elif 0 <= delta_min <= 95:
            # Halftime window: between 45min and 60min real time
            raw = int(delta_min)
            if 45 < raw <= 60:
                status = "halftime"
                minute = 45
            else:
                status = "live"
                if raw <= 45:
                    minute = max(1, raw)
                else:
                    minute = min(90, raw - 15)
            home_score = s.get("home_score", 0)
            away_score = s.get("away_score", 0)
        else:
            status = "scheduled"
            minute = None
            home_score = None
            away_score = None

        matches.append(Match(
            id=s["id"],
            stage=s["stage"],
            venue=s["venue"],
            kickoff=kickoff.isoformat(),
            status=status,
            minute=minute,
            home=TEAMS[s["home"]],
            away=TEAMS[s["away"]],
            home_score=home_score,
            away_score=away_score,
        ))

    return matches


# ---------- Group standings (demo data) ----------
class TeamStanding(BaseModel):
    team: Team
    played: int
    wins: int
    draws: int
    losses: int
    goals_for: int
    goals_against: int
    goal_diff: int
    points: int


class Group(BaseModel):
    name: str
    standings: List[TeamStanding]


def _build_groups() -> List[Group]:
    """Static realistic group standings for demo display."""
    raw = {
        "A": [
            ("GER", 3, 3, 0, 0, 7, 2),
            ("JPN", 3, 2, 0, 1, 5, 4),
            ("MAR", 3, 1, 0, 2, 3, 4),
            ("USA", 3, 0, 0, 3, 2, 7),
        ],
        "B": [
            ("BRA", 3, 2, 1, 0, 6, 1),
            ("ARG", 3, 2, 0, 1, 5, 3),
            ("MEX", 3, 1, 0, 2, 2, 4),
            ("URU", 3, 0, 1, 2, 1, 6),
        ],
        "C": [
            ("ESP", 3, 2, 1, 0, 5, 2),
            ("POR", 3, 2, 1, 0, 4, 1),
            ("CRO", 3, 1, 0, 2, 3, 5),
            ("NED", 3, 0, 0, 3, 1, 5),
        ],
        "D": [
            ("FRA", 3, 3, 0, 0, 8, 2),
            ("ITA", 3, 1, 1, 1, 4, 4),
            ("BEL", 3, 1, 1, 1, 3, 3),
            ("ENG", 3, 0, 0, 3, 1, 7),
        ],
    }
    groups: List[Group] = []
    for name, rows in raw.items():
        standings = []
        for code, played, w, d, lo, gf, ga in rows:
            standings.append(TeamStanding(
                team=TEAMS[code],
                played=played, wins=w, draws=d, losses=lo,
                goals_for=gf, goals_against=ga,
                goal_diff=gf - ga,
                points=w * 3 + d,
            ))
        standings.sort(key=lambda s: (s.points, s.goal_diff, s.goals_for), reverse=True)
        groups.append(Group(name=f"Gruppe {name}", standings=standings))
    return groups


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "Jandia Arena TV Dashboard API"}


def _is_today(iso: str) -> bool:
    d = datetime.fromisoformat(iso)
    n = _now()
    return d.date() == n.date()


def _is_tomorrow(iso: str) -> bool:
    d = datetime.fromisoformat(iso)
    n = _now()
    return d.date() == (n + timedelta(days=1)).date()


# Tracks last-known data source so /api/source reports accurately
_state = {"matches_source": "demo", "groups_source": "demo"}


async def _resolve_matches() -> tuple[List[Match], str]:
    """Try API-Football for today + tomorrow. Fall back to demo if empty/unavailable."""
    if football_api.is_api_configured():
        n = _now()
        today = n.strftime("%Y-%m-%d")
        tomorrow = (n + timedelta(days=1)).strftime("%Y-%m-%d")
        today_data = await football_api.fetch_fixtures(today)
        tomorrow_data = await football_api.fetch_fixtures(tomorrow)
        combined = []
        if today_data:
            combined.extend(today_data)
        if tomorrow_data:
            combined.extend(tomorrow_data)
        if combined:
            matches = [Match(**m) for m in combined]
            return matches, "api"
    return _build_matches(), "demo"


async def _resolve_groups() -> tuple[List[Group], str]:
    if football_api.is_api_configured():
        data = await football_api.fetch_standings()
        if data:
            groups = []
            for g in data:
                standings = [TeamStanding(**s) for s in g["standings"]]
                groups.append(Group(name=g["name"], standings=standings))
            if groups:
                return groups, "api"
    return _build_groups(), "demo"


async def _resolve_matches_all() -> tuple[List[Match], str]:
    """Full tournament schedule. Falls back to demo when API empty.

    Also falls back to demo if the API has no matches in the next 7 days –
    so the Schedule (week-strip) screen always shows something meaningful
    even before/between tournaments.
    """
    if football_api.is_api_configured():
        data = await football_api.fetch_all_matches()
        if data:
            matches = [Match(**m) for m in data]
            n = _now()
            week_end = n + timedelta(days=7)
            in_window = [
                m for m in matches
                if n.date() <= datetime.fromisoformat(m.kickoff).date() <= week_end.date()
            ]
            if in_window:
                return matches, "api"
    return _build_matches(), "demo"


@api_router.get("/now")
async def get_now():
    """Returns the dashboard's reference time (real or simulated).

    `goal_test_at` is bumped by /api/admin/goal-test and lets the dashboard
    fire the Deutschland goal-celebration overlay on demand for QA.
    """
    n = _now()
    sim = _effective_simulate_date()
    return {
        "iso": n.isoformat(),
        "date": n.strftime("%Y-%m-%d"),
        "simulated": bool(sim),
        "goal_test_at": _signals["goal_test_at"],
    }


# ---------- Runtime signals (admin → dashboard one-shot triggers) ----------
_signals: dict = {"goal_test_at": None}


@api_router.post("/admin/goal-test")
async def trigger_goal_test():
    """Bump the goal-test timestamp. The dashboard polls /api/now and will
    show the Deutschland goal animation once when this changes."""
    ts = datetime.now(timezone.utc).isoformat()
    _signals["goal_test_at"] = ts
    return {"ok": True, "goal_test_at": ts}


# ---------- Runtime settings: simulate-date toggle ----------
_RUNTIME_DOC_ID = "simulate_date"


async def _load_simulate_date_override():
    """Hydrate the in-memory override from MongoDB on startup."""
    try:
        doc = await db.runtime_settings.find_one({"_id": _RUNTIME_DOC_ID})
        if doc is None:
            _runtime_state["simulate_date_override"] = None
        else:
            # value: None means use env, "" means live, else date string
            _runtime_state["simulate_date_override"] = doc.get("value")
    except Exception as e:  # noqa: BLE001
        logging.getLogger(__name__).warning("Load simulate-date override failed: %s", e)


class SimulateDateBody(BaseModel):
    date: str  # "YYYY-MM-DD"


@api_router.get("/settings/simulate-date")
async def get_simulate_date():
    override = _runtime_state.get("simulate_date_override")
    env_value = os.environ.get("SIMULATE_DATE", "").strip()
    effective = _effective_simulate_date()
    if override is None:
        source = "env" if env_value else "live"
    elif override == "":
        source = "runtime_live"
    else:
        source = "runtime_simulated"
    return {
        "effective_date": effective,            # "" = live mode
        "live": effective == "",
        "source": source,                       # env | live | runtime_live | runtime_simulated
        "env_value": env_value,
        "override": override,
    }


@api_router.put("/settings/simulate-date")
async def set_simulate_date(body: SimulateDateBody):
    """Set a simulated date as a runtime override (persists in Mongo)."""
    date_str = (body.date or "").strip()
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return {"ok": False, "error": "invalid_date_format", "expected": "YYYY-MM-DD"}
    await db.runtime_settings.update_one(
        {"_id": _RUNTIME_DOC_ID},
        {"$set": {"value": date_str, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    _runtime_state["simulate_date_override"] = date_str
    football_api.cache_clear()
    return await get_simulate_date()


@api_router.post("/settings/simulate-date/live")
async def enable_live_mode():
    """Switch off all simulation (overrides any env value). Real-time data only."""
    await db.runtime_settings.update_one(
        {"_id": _RUNTIME_DOC_ID},
        {"$set": {"value": "", "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    _runtime_state["simulate_date_override"] = ""
    football_api.cache_clear()
    return await get_simulate_date()


@api_router.delete("/settings/simulate-date")
async def reset_simulate_date():
    """Remove the runtime override, falling back to the env-configured default."""
    await db.runtime_settings.delete_one({"_id": _RUNTIME_DOC_ID})
    _runtime_state["simulate_date_override"] = None
    football_api.cache_clear()
    return await get_simulate_date()


# ====================================================================
# LIVE-CONTROL — Mobile Admin Remote / Regiezentrale
# ====================================================================
# A single Mongo document `tv_control.singleton` mirrors the in-memory
# state. The TV dashboard polls /api/control/state every 2-3s and reacts.
ALLOWED_SCREENS = {
    "today", "next", "germany", "tomorrow", "schedule", "groups", "experts",
}

_CONTROL_DOC_ID = "singleton"
_control_state: dict = {
    "rotation_paused": False,
    "pinned_screen": None,
    "forced_action": None,   # {"type": "show"|"next"|"previous", "screen": str|None, "token": int}
    "reload_token": 0,
    "hide_overlays": False,
    "updated_at": None,
}
_forced_token_counter: int = 0


def _control_snapshot() -> dict:
    return {
        "rotation_paused": bool(_control_state["rotation_paused"]),
        "pinned_screen": _control_state["pinned_screen"],
        "forced_action": _control_state["forced_action"],
        "reload_token": int(_control_state["reload_token"]),
        "hide_overlays": bool(_control_state["hide_overlays"]),
        "updated_at": _control_state["updated_at"],
    }


async def _persist_control() -> None:
    _control_state["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.tv_control.update_one(
        {"_id": _CONTROL_DOC_ID},
        {"$set": _control_snapshot()},
        upsert=True,
    )


async def _load_control_state() -> None:
    global _forced_token_counter
    try:
        doc = await db.tv_control.find_one({"_id": _CONTROL_DOC_ID})
        if doc:
            for k in ("rotation_paused", "pinned_screen", "forced_action",
                      "reload_token", "hide_overlays", "updated_at"):
                if k in doc:
                    _control_state[k] = doc[k]
            if isinstance(_control_state.get("forced_action"), dict):
                _forced_token_counter = max(
                    _forced_token_counter,
                    int(_control_state["forced_action"].get("token", 0)),
                )
    except Exception as e:  # noqa: BLE001
        logging.getLogger(__name__).warning("Load tv_control failed: %s", e)


def _next_forced_token() -> int:
    global _forced_token_counter
    _forced_token_counter += 1
    return _forced_token_counter


class ScreenBody(BaseModel):
    screen: str


class HideOverlaysBody(BaseModel):
    hide: bool


@api_router.get("/control/state")
async def get_control_state():
    return _control_snapshot()


@api_router.post("/control/rotation/pause")
async def control_pause():
    _control_state["rotation_paused"] = True
    await _persist_control()
    return _control_snapshot()


@api_router.post("/control/rotation/resume")
async def control_resume():
    _control_state["rotation_paused"] = False
    await _persist_control()
    return _control_snapshot()


@api_router.post("/control/screen/next")
async def control_next():
    _control_state["forced_action"] = {
        "type": "next",
        "screen": None,
        "token": _next_forced_token(),
    }
    await _persist_control()
    return _control_snapshot()


@api_router.post("/control/screen/previous")
async def control_previous():
    _control_state["forced_action"] = {
        "type": "previous",
        "screen": None,
        "token": _next_forced_token(),
    }
    await _persist_control()
    return _control_snapshot()


@api_router.post("/control/screen/show")
async def control_show(body: ScreenBody):
    if body.screen not in ALLOWED_SCREENS:
        return {"ok": False, "error": "unknown_screen", "allowed": sorted(ALLOWED_SCREENS)}
    _control_state["forced_action"] = {
        "type": "show",
        "screen": body.screen,
        "token": _next_forced_token(),
    }
    await _persist_control()
    return _control_snapshot()


@api_router.post("/control/screen/pin")
async def control_pin(body: ScreenBody):
    if body.screen not in ALLOWED_SCREENS:
        return {"ok": False, "error": "unknown_screen", "allowed": sorted(ALLOWED_SCREENS)}
    _control_state["pinned_screen"] = body.screen
    await _persist_control()
    return _control_snapshot()


@api_router.post("/control/screen/unpin")
async def control_unpin():
    _control_state["pinned_screen"] = None
    await _persist_control()
    return _control_snapshot()


@api_router.post("/control/tv/reload")
async def control_reload():
    _control_state["reload_token"] = int(_control_state["reload_token"]) + 1
    await _persist_control()
    return _control_snapshot()


@api_router.post("/control/overlays/hide")
async def control_overlays(body: HideOverlaysBody):
    _control_state["hide_overlays"] = bool(body.hide)
    await _persist_control()
    return _control_snapshot()


@api_router.get("/source")
async def get_source():
    """Reports which data source is currently powering the dashboard."""
    return {
        "matches": _state["matches_source"],
        "groups": _state["groups_source"],
        "api_configured": football_api.is_api_configured(),
        "rate_limit": football_api.get_call_stats(),
    }


@api_router.get("/matches", response_model=List[Match])
async def get_matches():
    matches, src = await _resolve_matches()
    _state["matches_source"] = src
    return [m for m in matches if _is_today(m.kickoff)]


@api_router.get("/matches/all", response_model=List[Match])
async def get_all_matches():
    matches, src = await _resolve_matches()
    _state["matches_source"] = src
    return matches


@api_router.get("/matches/live", response_model=List[Match])
async def get_live_matches():
    matches, src = await _resolve_matches()
    _state["matches_source"] = src
    return [m for m in matches if m.status in ("live", "halftime")]


@api_router.get("/matches/next", response_model=Optional[Match])
async def get_next_match():
    matches, src = await _resolve_matches()
    _state["matches_source"] = src
    upcoming = [m for m in matches if m.status == "scheduled"]
    upcoming.sort(key=lambda m: m.kickoff)
    return upcoming[0] if upcoming else None


@api_router.get("/matches/tomorrow", response_model=List[Match])
async def get_tomorrow_matches():
    matches, src = await _resolve_matches()
    _state["matches_source"] = src
    return [m for m in matches if _is_tomorrow(m.kickoff)]


@api_router.get("/matches/finished", response_model=List[Match])
async def get_finished_matches():
    matches, src = await _resolve_matches()
    _state["matches_source"] = src
    return [m for m in matches if m.status == "finished"]


@api_router.get("/groups", response_model=List[Group])
async def get_groups():
    groups, src = await _resolve_groups()
    _state["groups_source"] = src
    return groups


# ---------- Schedule (full tournament, grouped by day) ----------
class ScheduleDay(BaseModel):
    date: str       # ISO date YYYY-MM-DD
    phase: str      # primary phase label for the day (e.g. "Gruppenphase")
    matches: List[Match]


def _primary_phase(matches: List[Match]) -> str:
    """Pick the most-advanced stage on a given day, or first non-empty stage."""
    order = [
        "Finale", "Spiel um Platz 3", "Halbfinale", "Viertelfinale",
        "Achtelfinale", "Vorrunde", "Gruppenphase",
    ]
    stages = {m.stage for m in matches if m.stage}
    # Group A/B/C → all roll up under "Gruppenphase" for header label
    normalised = set()
    for s in stages:
        if s.startswith("Gruppe ") and len(s) <= 10:
            normalised.add("Gruppenphase")
        else:
            normalised.add(s)
    for o in order:
        if o in normalised:
            return o
    return next(iter(normalised), "")


@api_router.get("/schedule", response_model=List[ScheduleDay])
async def get_schedule():
    matches, src = await _resolve_matches_all()
    _state["matches_source"] = src
    by_day: dict[str, List[Match]] = {}
    for m in matches:
        d = datetime.fromisoformat(m.kickoff).date().isoformat()
        by_day.setdefault(d, []).append(m)
    days = []
    for d in sorted(by_day.keys()):
        ms = sorted(by_day[d], key=lambda x: x.kickoff)
        days.append(ScheduleDay(date=d, phase=_primary_phase(ms), matches=ms))
    return days


app.include_router(api_router)
app.include_router(lower_thirds_module.router)
app.include_router(experts_module.router)


@app.on_event("startup")
async def _seed_lower_thirds():
    try:
        await lower_thirds_module.seed_defaults_if_empty()
    except Exception as e:
        logging.getLogger(__name__).warning("Lower Thirds seed failed: %s", e)


@app.on_event("startup")
async def _seed_experts():
    try:
        await experts_module.seed_defaults_if_empty()
    except Exception as e:
        logging.getLogger(__name__).warning("Experts seed failed: %s", e)


@app.on_event("startup")
async def _init_object_storage():
    experts_module.init_storage_safe()


@app.on_event("startup")
async def _hydrate_runtime_settings():
    await _load_simulate_date_override()


@app.on_event("startup")
async def _hydrate_control_state():
    await _load_control_state()

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
