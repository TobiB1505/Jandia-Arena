"""Live data source: API-Football (api-sports.io) with cache + graceful fallback."""
import os
import time
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple, Any
import httpx

logger = logging.getLogger(__name__)

API_BASE = "https://v3.football.api-sports.io"
CACHE_TTL_FIXTURES = 180   # 3 minutes – fixtures + live scores
CACHE_TTL_STANDINGS = 1800  # 30 minutes


# Country → ISO flag code + German display name
# Covers all teams typically in FIFA World Cup
COUNTRY_INFO = {
    "Germany": ("DE", "Deutschland"),
    "Spain": ("ES", "Spanien"),
    "France": ("FR", "Frankreich"),
    "Brazil": ("BR", "Brasilien"),
    "Argentina": ("AR", "Argentinien"),
    "England": ("GB-ENG", "England"),
    "Portugal": ("PT", "Portugal"),
    "Netherlands": ("NL", "Niederlande"),
    "Italy": ("IT", "Italien"),
    "Belgium": ("BE", "Belgien"),
    "Croatia": ("HR", "Kroatien"),
    "Uruguay": ("UY", "Uruguay"),
    "Mexico": ("MX", "Mexiko"),
    "USA": ("US", "USA"),
    "United States": ("US", "USA"),
    "Japan": ("JP", "Japan"),
    "Morocco": ("MA", "Marokko"),
    "Switzerland": ("CH", "Schweiz"),
    "Denmark": ("DK", "Dänemark"),
    "Poland": ("PL", "Polen"),
    "Senegal": ("SN", "Senegal"),
    "South-Korea": ("KR", "Südkorea"),
    "Korea Republic": ("KR", "Südkorea"),
    "South Korea": ("KR", "Südkorea"),
    "Iran": ("IR", "Iran"),
    "Saudi-Arabia": ("SA", "Saudi-Arabien"),
    "Saudi Arabia": ("SA", "Saudi-Arabien"),
    "Tunisia": ("TN", "Tunesien"),
    "Australia": ("AU", "Australien"),
    "Canada": ("CA", "Kanada"),
    "Costa-Rica": ("CR", "Costa Rica"),
    "Costa Rica": ("CR", "Costa Rica"),
    "Cameroon": ("CM", "Kamerun"),
    "Ecuador": ("EC", "Ecuador"),
    "Ghana": ("GH", "Ghana"),
    "Qatar": ("QA", "Katar"),
    "Serbia": ("RS", "Serbien"),
    "Wales": ("GB-WLS", "Wales"),
    "Norway": ("NO", "Norwegen"),
    "Sweden": ("SE", "Schweden"),
    "Austria": ("AT", "Österreich"),
    "Hungary": ("HU", "Ungarn"),
    "Turkey": ("TR", "Türkei"),
    "Greece": ("GR", "Griechenland"),
    "Egypt": ("EG", "Ägypten"),
    "Nigeria": ("NG", "Nigeria"),
    "Algeria": ("DZ", "Algerien"),
    "Ivory Coast": ("CI", "Elfenbeinküste"),
    "Colombia": ("CO", "Kolumbien"),
    "Chile": ("CL", "Chile"),
    "Peru": ("PE", "Peru"),
    "Paraguay": ("PY", "Paraguay"),
    "Venezuela": ("VE", "Venezuela"),
    "New Zealand": ("NZ", "Neuseeland"),
    "Czech Republic": ("CZ", "Tschechien"),
    "Czechia": ("CZ", "Tschechien"),
    "Romania": ("RO", "Rumänien"),
    "Slovakia": ("SK", "Slowakei"),
    "Ukraine": ("UA", "Ukraine"),
    "Bosnia and Herzegovina": ("BA", "Bosnien-Herzegowina"),
    "Albania": ("AL", "Albanien"),
    "Iceland": ("IS", "Island"),
    "Republic of Ireland": ("IE", "Irland"),
    "Northern Ireland": ("GB-NIR", "Nordirland"),
    "Scotland": ("GB-SCT", "Schottland"),
}


def _country_meta(country: Optional[str], team_name: str) -> Tuple[str, str, str]:
    """Return (iso_code, german_name, short3)."""
    info = COUNTRY_INFO.get(country or "")
    if info:
        code, de_name = info
    else:
        code, de_name = ("UN", team_name)
    short = team_name[:3].upper() if team_name else "—"
    return code, de_name, short


# ---------- Cache helpers ----------
_cache: dict = {}


def _cache_get(key: str, ttl: int):
    entry = _cache.get(key)
    if not entry:
        return None
    ts, value = entry
    if time.time() - ts > ttl:
        return None
    return value


def _cache_set(key: str, value: Any):
    _cache[key] = (time.time(), value)


# ---------- API client ----------
async def _api_get(path: str, params: dict) -> Optional[list]:
    key = os.environ.get("FOOTBALL_API_KEY", "").strip()
    if not key:
        return None
    headers = {"x-apisports-key": key}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(f"{API_BASE}{path}", params=params, headers=headers)
        if r.status_code != 200:
            logger.warning("API-Football %s → %s: %s", path, r.status_code, r.text[:200])
            return None
        data = r.json()
        if data.get("errors"):
            logger.warning("API-Football %s errors: %s", path, data["errors"])
        return data.get("response") or []
    except Exception as e:
        logger.warning("API-Football request failed (%s): %s", path, e)
        return None


# ---------- Status mapping ----------
_FINISHED = {"FT", "AET", "PEN", "AWD", "WO"}
_LIVE = {"1H", "2H", "ET", "P", "LIVE"}


def _map_status(short_code: str, elapsed: Optional[int]):
    if short_code in _FINISHED:
        return "finished", None
    if short_code == "HT":
        return "halftime", 45
    if short_code in _LIVE:
        return "live", int(elapsed or 0) or 1
    return "scheduled", None


# ---------- Public API ----------
async def fetch_fixtures(date_str: str) -> Optional[list]:
    """Fetch fixtures for a given date (YYYY-MM-DD) from the configured league/season.
    Returns list of mapped match dicts, or None if API unavailable / no data.
    """
    cache_key = f"fixtures:{date_str}"
    cached = _cache_get(cache_key, CACHE_TTL_FIXTURES)
    if cached is not None:
        return cached

    league = os.environ.get("FOOTBALL_LEAGUE_ID", "1")
    season = os.environ.get("FOOTBALL_SEASON", "2026")
    raw = await _api_get(
        "/fixtures",
        {"date": date_str, "league": league, "season": season, "timezone": "Europe/Berlin"},
    )
    if raw is None:
        return None

    matches = []
    for item in raw:
        try:
            f = item["fixture"]
            teams = item["teams"]
            goals = item["goals"]
            league_info = item.get("league", {})

            status_short = f["status"]["short"]
            elapsed = f["status"].get("elapsed")
            status, minute = _map_status(status_short, elapsed)

            h_code, h_de, h_short = _country_meta(
                teams["home"].get("country") or teams["home"].get("name"),
                teams["home"]["name"],
            )
            a_code, a_de, a_short = _country_meta(
                teams["away"].get("country") or teams["away"].get("name"),
                teams["away"]["name"],
            )

            matches.append({
                "id": f"api-{f['id']}",
                "stage": league_info.get("round") or "",
                "venue": (f.get("venue") or {}).get("name") or "—",
                "kickoff": f["date"],
                "status": status,
                "minute": minute,
                "home": {"code": h_code, "name": h_de, "short": h_short},
                "away": {"code": a_code, "name": a_de, "short": a_short},
                "home_score": goals.get("home"),
                "away_score": goals.get("away"),
            })
        except Exception as e:
            logger.warning("fixture map failed: %s", e)

    matches.sort(key=lambda m: m["kickoff"])
    _cache_set(cache_key, matches)
    return matches


async def fetch_standings() -> Optional[list]:
    cache_key = "standings"
    cached = _cache_get(cache_key, CACHE_TTL_STANDINGS)
    if cached is not None:
        return cached

    league = os.environ.get("FOOTBALL_LEAGUE_ID", "1")
    season = os.environ.get("FOOTBALL_SEASON", "2026")
    raw = await _api_get("/standings", {"league": league, "season": season})
    if raw is None:
        return None

    groups = []
    try:
        for league_obj in raw:
            lg = league_obj.get("league", {})
            for group in lg.get("standings", []) or []:
                group_name = (group[0].get("group") if group else None) or "Gruppe"
                standings = []
                for s in group:
                    team = s.get("team", {})
                    all_stats = s.get("all", {})
                    goals = all_stats.get("goals", {}) or {}
                    code, de, short = _country_meta(team.get("name"), team.get("name", ""))
                    standings.append({
                        "team": {"code": code, "name": de, "short": short},
                        "played": all_stats.get("played", 0),
                        "wins": all_stats.get("win", 0),
                        "draws": all_stats.get("draw", 0),
                        "losses": all_stats.get("lose", 0),
                        "goals_for": goals.get("for", 0),
                        "goals_against": goals.get("against", 0),
                        "goal_diff": s.get("goalsDiff", 0),
                        "points": s.get("points", 0),
                    })
                groups.append({"name": group_name, "standings": standings})
    except Exception as e:
        logger.warning("standings map failed: %s", e)
        return None

    _cache_set(cache_key, groups)
    return groups


def is_api_configured() -> bool:
    return bool(os.environ.get("FOOTBALL_API_KEY", "").strip())
