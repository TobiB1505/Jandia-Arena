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
            "id": "m1", "stage": "Gruppe A", "venue": "Lusail Stadium",
            "kickoff": now - timedelta(hours=4, minutes=30), "home": "GER", "away": "JPN",
            "home_score": 3, "away_score": 1,
        },
        {
            "id": "m2", "stage": "Gruppe B", "venue": "Al Bayt Stadium",
            "kickoff": now - timedelta(hours=2, minutes=45), "home": "BRA", "away": "MEX",
            "home_score": 2, "away_score": 0,
        },
        # LIVE now (offsets relative to now)
        {
            "id": "m3", "stage": "Gruppe C", "venue": "Education City",
            "kickoff": now - timedelta(minutes=37), "home": "ESP", "away": "POR",
            "home_score": 1, "away_score": 1,
        },
        {
            "id": "m4", "stage": "Gruppe D", "venue": "Stadium 974",
            "kickoff": now - timedelta(minutes=62), "home": "FRA", "away": "ITA",
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
            status = "live"
            # Skip halftime visualisation between 45..60 ish, clamp realistically
            raw = int(delta_min)
            if raw <= 45:
                minute = max(1, raw)
            elif raw <= 60:
                minute = 45  # halftime stays at 45
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


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "Jandia Arena TV Dashboard API"}


@api_router.get("/matches", response_model=List[Match])
async def get_matches():
    """Return today's full demo match list with computed statuses."""
    return _build_matches()


@api_router.get("/matches/live", response_model=List[Match])
async def get_live_matches():
    return [m for m in _build_matches() if m.status == "live"]


@api_router.get("/matches/next", response_model=Optional[Match])
async def get_next_match():
    upcoming = [m for m in _build_matches() if m.status == "scheduled"]
    upcoming.sort(key=lambda m: m.kickoff)
    return upcoming[0] if upcoming else None


@api_router.get("/matches/finished", response_model=List[Match])
async def get_finished_matches():
    return [m for m in _build_matches() if m.status == "finished"]


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
