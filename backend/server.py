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
# Anchor 'today' to current server day so the TV looks fresh every day.
def _now() -> datetime:
    return datetime.now(timezone.utc)


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
            "id": "m1", "stage": "Group A", "venue": "Lusail Stadium",
            "kickoff": now - timedelta(hours=4, minutes=30), "home": "GER", "away": "JPN",
            "home_score": 3, "away_score": 1,
        },
        {
            "id": "m2", "stage": "Group B", "venue": "Al Bayt Stadium",
            "kickoff": now - timedelta(hours=2, minutes=45), "home": "BRA", "away": "MEX",
            "home_score": 2, "away_score": 0,
        },
        # LIVE now (offsets relative to now). m3 is in first half, m4 is in halftime window.
        {
            "id": "m3", "stage": "Group C", "venue": "Education City",
            "kickoff": now - timedelta(minutes=37), "home": "ESP", "away": "POR",
            "home_score": 1, "away_score": 1,
        },
        {
            "id": "m4", "stage": "Group D", "venue": "Stadium 974",
            "kickoff": now - timedelta(minutes=50), "home": "FRA", "away": "ITA",
            "home_score": 2, "away_score": 1,
        },
        # NEXT / Upcoming today
        {
            "id": "m5", "stage": "Round of 16", "venue": "Khalifa International",
            "kickoff": now + timedelta(minutes=18), "home": "ARG", "away": "NED",
        },
        {
            "id": "m6", "stage": "Round of 16", "venue": "Al Janoub Stadium",
            "kickoff": now + timedelta(hours=2, minutes=30), "home": "ENG", "away": "BEL",
        },
        {
            "id": "m7", "stage": "Round of 16", "venue": "Ahmad bin Ali",
            "kickoff": now + timedelta(hours=5, minutes=0), "home": "CRO", "away": "MAR",
        },
        {
            "id": "m8", "stage": "Round of 16", "venue": "Al Thumama",
            "kickoff": now + timedelta(hours=7, minutes=30), "home": "URU", "away": "USA",
        },
        # TOMORROW
        {
            "id": "t1", "stage": "Quarter-final", "venue": "Lusail Stadium",
            "kickoff": now + timedelta(days=1, hours=-2), "home": "GER", "away": "ESP",
        },
        {
            "id": "t2", "stage": "Quarter-final", "venue": "Al Bayt Stadium",
            "kickoff": now + timedelta(days=1, hours=1), "home": "FRA", "away": "POR",
        },
        {
            "id": "t3", "stage": "Quarter-final", "venue": "Education City",
            "kickoff": now + timedelta(days=1, hours=4), "home": "BRA", "away": "ARG",
        },
        {
            "id": "t4", "stage": "Quarter-final", "venue": "Stadium 974",
            "kickoff": now + timedelta(days=1, hours=6, minutes=30), "home": "ENG", "away": "NED",
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
            ("JPN", 3, 0, 0, 3, 1, 5),
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
        groups.append(Group(name=f"Group {name}", standings=standings))
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


@api_router.get("/matches", response_model=List[Match])
async def get_matches():
    """Return today's matches with computed statuses."""
    return [m for m in _build_matches() if _is_today(m.kickoff)]


@api_router.get("/matches/all", response_model=List[Match])
async def get_all_matches():
    """Return the full demo schedule (today + tomorrow)."""
    return _build_matches()


@api_router.get("/matches/live", response_model=List[Match])
async def get_live_matches():
    return [m for m in _build_matches() if m.status in ("live", "halftime")]


@api_router.get("/matches/next", response_model=Optional[Match])
async def get_next_match():
    upcoming = [m for m in _build_matches() if m.status == "scheduled"]
    upcoming.sort(key=lambda m: m.kickoff)
    return upcoming[0] if upcoming else None


@api_router.get("/matches/tomorrow", response_model=List[Match])
async def get_tomorrow_matches():
    return [m for m in _build_matches() if _is_tomorrow(m.kickoff)]


@api_router.get("/matches/finished", response_model=List[Match])
async def get_finished_matches():
    return [m for m in _build_matches() if m.status == "finished"]


@api_router.get("/groups", response_model=List[Group])
async def get_groups():
    return _build_groups()


app.include_router(api_router)

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
