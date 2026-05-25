"""Live data source: Football-Data.org v4 with cache + graceful demo fallback.

Free tier: 10 requests/minute, supports Tier-1 competitions including WC, CL, EC,
Bundesliga (BL1), Premier League (PL), La Liga (PD), Serie A (SA), Ligue 1 (FL1).
"""
import os
import time
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple, Any
import httpx

logger = logging.getLogger(__name__)

API_BASE = "https://api.football-data.org/v4"
CACHE_TTL_FIXTURES = 180     # 3 min – fixtures + live scores
CACHE_TTL_STANDINGS = 300    # 5 min – standings update faster


# Team / Country → ISO flag code + German display name.
# Football-Data.org returns team.name in English (e.g. "Germany").
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
    "Korea Republic": ("KR", "Südkorea"),
    "South Korea": ("KR", "Südkorea"),
    "IR Iran": ("IR", "Iran"),
    "Iran": ("IR", "Iran"),
    "Saudi Arabia": ("SA", "Saudi-Arabien"),
    "Tunisia": ("TN", "Tunesien"),
    "Australia": ("AU", "Australien"),
    "Canada": ("CA", "Kanada"),
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
    "Türkiye": ("TR", "Türkei"),
    "Greece": ("GR", "Griechenland"),
    "Egypt": ("EG", "Ägypten"),
    "Nigeria": ("NG", "Nigeria"),
    "Algeria": ("DZ", "Algerien"),
    "Côte d'Ivoire": ("CI", "Elfenbeinküste"),
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
    "Bosnia-Herzegovina": ("BA", "Bosnien-Herzegowina"),
    "Albania": ("AL", "Albanien"),
    "Iceland": ("IS", "Island"),
    "Republic of Ireland": ("IE", "Irland"),
    "Northern Ireland": ("GB-NIR", "Nordirland"),
    "Scotland": ("GB-SCT", "Schottland"),
    "South Africa": ("ZA", "Südafrika"),
    "Haiti": ("HT", "Haiti"),
    "Curaçao": ("CW", "Curaçao"),
    "Curacao": ("CW", "Curaçao"),
    "Iraq": ("IQ", "Irak"),
    "Jordan": ("JO", "Jordanien"),
    "DR Congo": ("CD", "DR Kongo"),
    "Congo DR": ("CD", "DR Kongo"),
    "Uzbekistan": ("UZ", "Usbekistan"),
    "Panama": ("PA", "Panama"),
    "Cabo Verde": ("CV", "Kap Verde"),
    "Cape Verde": ("CV", "Kap Verde"),
    "Russia": ("RU", "Russland"),
    "Slovenia": ("SI", "Slowenien"),
    "Bulgaria": ("BG", "Bulgarien"),
    "Finland": ("FI", "Finnland"),
    "Israel": ("IL", "Israel"),
}

# 3-letter ISO (FIFA TLA) → 2-letter ISO fallback when name lookup fails.
TLA_TO_CODE = {
    "GER": "DE", "ESP": "ES", "FRA": "FR", "BRA": "BR", "ARG": "AR",
    "ENG": "GB-ENG", "POR": "PT", "NED": "NL", "ITA": "IT", "BEL": "BE",
    "CRO": "HR", "URU": "UY", "URY": "UY", "MEX": "MX", "USA": "US",
    "JPN": "JP", "MAR": "MA", "SUI": "CH", "DEN": "DK", "POL": "PL",
    "SEN": "SN", "KOR": "KR", "IRN": "IR", "KSA": "SA", "TUN": "TN",
    "AUS": "AU", "CAN": "CA", "CRC": "CR", "CMR": "CM", "ECU": "EC",
    "GHA": "GH", "QAT": "QA", "SRB": "RS", "WAL": "GB-WLS", "NOR": "NO",
    "SWE": "SE", "AUT": "AT", "HUN": "HU", "TUR": "TR", "GRE": "GR",
    "EGY": "EG", "NGA": "NG", "ALG": "DZ", "CIV": "CI", "COL": "CO",
    "CHI": "CL", "PER": "PE", "PAR": "PY", "VEN": "VE", "NZL": "NZ",
    "CZE": "CZ", "ROU": "RO", "SVK": "SK", "UKR": "UA", "BIH": "BA",
    "ALB": "AL", "ISL": "IS", "IRL": "IE", "NIR": "GB-NIR", "SCO": "GB-SCT",
    "RSA": "ZA", "HAI": "HT", "CUW": "CW", "IRQ": "IQ", "JOR": "JO",
    "COD": "CD", "UZB": "UZ", "PAN": "PA", "CPV": "CV", "RUS": "RU",
    "SVN": "SI", "BUL": "BG", "FIN": "FI", "ISR": "IL",
}


def _team_meta(team: dict) -> Tuple[str, str, str]:
    """Return (iso_code, german_name, short3) from a football-data team object."""
    name = team.get("name") or team.get("shortName") or "—"
    tla = team.get("tla") or name[:3].upper()
    info = COUNTRY_INFO.get(name)
    if info:
        code, de_name = info
    elif tla in TLA_TO_CODE:
        code = TLA_TO_CODE[tla]
        de_name = name
    else:
        code = "UN"
        de_name = name
    return code, de_name, tla


# ---------- Cache ----------
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


def cache_clear():
    """Wipe the entire in-memory cache (e.g. after simulated-date toggle)."""
    _cache.clear()


# ---------- HTTP client ----------
async def _api_get(path: str, params: dict | None = None) -> Optional[dict]:
    key = os.environ.get("FOOTBALL_API_KEY", "").strip()
    if not key:
        return None
    headers = {"X-Auth-Token": key}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(
                f"{API_BASE}{path}", params=params or {}, headers=headers
            )
        if r.status_code == 429:
            logger.warning("Football-Data rate limited (429) for %s", path)
            return None
        if r.status_code != 200:
            logger.warning(
                "Football-Data %s → %s: %s", path, r.status_code, r.text[:200]
            )
            return None
        return r.json()
    except Exception as e:
        logger.warning("Football-Data request failed (%s): %s", path, e)
        return None


# ---------- Status mapping ----------
# Football-Data.org status values
_FINISHED = {"FINISHED", "AWARDED"}
_LIVE = {"IN_PLAY", "LIVE"}
_HALFTIME = {"PAUSED"}
_SCHEDULED = {"SCHEDULED", "TIMED", "POSTPONED", "SUSPENDED"}


def _map_status(status: str, minute: Optional[int]) -> Tuple[str, Optional[int]]:
    if status in _FINISHED:
        return "finished", None
    if status in _HALFTIME:
        return "halftime", 45
    if status in _LIVE:
        return "live", int(minute or 0) or 1
    return "scheduled", None


# ---------- Stage formatting ----------
_STAGE_DE = {
    "GROUP_STAGE": "Gruppenphase",
    "LAST_16": "Achtelfinale",
    "ROUND_OF_16": "Achtelfinale",
    "QUARTER_FINALS": "Viertelfinale",
    "SEMI_FINALS": "Halbfinale",
    "FINAL": "Finale",
    "THIRD_PLACE": "Spiel um Platz 3",
    "PRELIMINARY_ROUND": "Vorrunde",
    "PLAY_OFFS": "Playoffs",
    "REGULAR_SEASON": "Hauptrunde",
}


def _format_stage(stage: Optional[str], group: Optional[str]) -> str:
    label = _STAGE_DE.get((stage or "").upper(), stage or "")
    if (stage or "").upper() == "GROUP_STAGE" and group:
        # group can be "GROUP_A" or "A" – normalise
        g = group.replace("GROUP_", "").strip()
        return f"Gruppe {g}"
    return label or ""


# ---------- Public API ----------
async def fetch_all_matches() -> Optional[list]:
    """Fetch the full competition schedule (all matches across all dates)."""
    cache_key = "all_matches"
    cached = _cache_get(cache_key, CACHE_TTL_FIXTURES)
    if cached is not None:
        return cached

    competition = os.environ.get("FOOTBALL_COMPETITION", "WC")
    data = await _api_get(f"/competitions/{competition}/matches")
    if data is None:
        return None

    matches = []
    for m in data.get("matches", []) or []:
        try:
            status, minute = _map_status(m.get("status", ""), m.get("minute"))
            h_code, h_de, h_short = _team_meta(m.get("homeTeam") or {})
            a_code, a_de, a_short = _team_meta(m.get("awayTeam") or {})
            score = (m.get("score") or {}).get("fullTime") or {}
            stage_raw = m.get("stage") or ""
            stage = _format_stage(stage_raw, m.get("group"))
            matches.append({
                "id": f"fd-{m['id']}",
                "stage": stage,
                "stage_raw": stage_raw,
                "venue": m.get("venue") or "—",
                "kickoff": m["utcDate"],
                "status": status,
                "minute": minute,
                "home": {"code": h_code, "name": h_de, "short": h_short},
                "away": {"code": a_code, "name": a_de, "short": a_short},
                "home_score": score.get("home"),
                "away_score": score.get("away"),
            })
        except Exception as e:
            logger.warning("fixture map failed: %s", e)

    matches.sort(key=lambda x: x["kickoff"])
    _cache_set(cache_key, matches)
    return matches


async def fetch_fixtures(date_str: str) -> Optional[list]:
    """Fetch fixtures for a given date (YYYY-MM-DD)."""
    cache_key = f"fixtures:{date_str}"
    cached = _cache_get(cache_key, CACHE_TTL_FIXTURES)
    if cached is not None:
        return cached

    competition = os.environ.get("FOOTBALL_COMPETITION", "WC")
    data = await _api_get(
        f"/competitions/{competition}/matches",
        {"dateFrom": date_str, "dateTo": date_str},
    )
    if data is None:
        return None

    matches = []
    for m in data.get("matches", []) or []:
        try:
            status, minute = _map_status(m.get("status", ""), m.get("minute"))
            h_code, h_de, h_short = _team_meta(m.get("homeTeam") or {})
            a_code, a_de, a_short = _team_meta(m.get("awayTeam") or {})
            score = (m.get("score") or {}).get("fullTime") or {}
            stage = _format_stage(m.get("stage"), m.get("group"))
            venue = m.get("venue") or "—"

            matches.append({
                "id": f"fd-{m['id']}",
                "stage": stage,
                "venue": venue,
                "kickoff": m["utcDate"],
                "status": status,
                "minute": minute,
                "home": {"code": h_code, "name": h_de, "short": h_short},
                "away": {"code": a_code, "name": a_de, "short": a_short},
                "home_score": score.get("home"),
                "away_score": score.get("away"),
            })
        except Exception as e:
            logger.warning("fixture map failed: %s", e)

    matches.sort(key=lambda x: x["kickoff"])
    _cache_set(cache_key, matches)
    return matches


async def fetch_standings() -> Optional[list]:
    cache_key = "standings"
    cached = _cache_get(cache_key, CACHE_TTL_STANDINGS)
    if cached is not None:
        return cached

    competition = os.environ.get("FOOTBALL_COMPETITION", "WC")
    data = await _api_get(f"/competitions/{competition}/standings")
    if data is None:
        return None

    groups = []
    try:
        for entry in data.get("standings", []) or []:
            # Football-data uses stage "ALL" for tournament standings,
            # "GROUP_STAGE" for some, and "REGULAR_SEASON" for leagues.
            if entry.get("type") != "TOTAL":
                continue
            group_name_raw = entry.get("group") or "Gruppe"
            if isinstance(group_name_raw, str):
                # Normalise "GROUP_A" or "Group A" → "Gruppe A"
                gn = group_name_raw.replace("GROUP_", "").replace("Group ", "").strip()
                group_name = f"Gruppe {gn}" if gn and len(gn) <= 4 else group_name_raw
            else:
                group_name = "Gruppe"
            standings = []
            for row in entry.get("table", []) or []:
                code, de, short = _team_meta(row.get("team") or {})
                standings.append({
                    "team": {"code": code, "name": de, "short": short},
                    "played": row.get("playedGames", 0),
                    "wins": row.get("won", 0),
                    "draws": row.get("draw", 0),
                    "losses": row.get("lost", 0),
                    "goals_for": row.get("goalsFor", 0),
                    "goals_against": row.get("goalsAgainst", 0),
                    "goal_diff": row.get("goalDifference", 0),
                    "points": row.get("points", 0),
                })
            if standings:
                groups.append({"name": group_name, "standings": standings})
    except Exception as e:
        logger.warning("standings map failed: %s", e)
        return None

    _cache_set(cache_key, groups)
    return groups


def is_api_configured() -> bool:
    return bool(os.environ.get("FOOTBALL_API_KEY", "").strip())
