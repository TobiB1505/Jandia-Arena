"""Backend API tests for Jandia Arena TV Dashboard (Iteration 2)."""
import os
from datetime import datetime

import pytest
import requests
from pathlib import Path


def _load_backend_url():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if url:
        return url.rstrip("/")
    # Fallback: read from frontend/.env
    env_path = Path(__file__).resolve().parents[2] / "frontend" / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not set")


BASE_URL = _load_backend_url()
API = f"{BASE_URL}/api"

TEAM_KEYS = {"code", "name", "short"}
MATCH_KEYS = {"id", "stage", "venue", "kickoff", "status", "home", "away",
              "home_score", "away_score"}
VALID_STATUSES = {"scheduled", "live", "halftime", "finished"}


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def all_matches():
    r = requests.get(f"{API}/matches/all", timeout=15)
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def today_matches():
    r = requests.get(f"{API}/matches", timeout=15)
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def tomorrow_matches():
    r = requests.get(f"{API}/matches/tomorrow", timeout=15)
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def groups():
    r = requests.get(f"{API}/groups", timeout=15)
    assert r.status_code == 200, r.text
    return r.json()


# ---------- /api/matches/all (12 matches) ----------
class TestMatchesAll:
    def test_returns_12_matches(self, all_matches):
        assert isinstance(all_matches, list)
        assert len(all_matches) == 12, f"Expected 12, got {len(all_matches)}"

    def test_structure(self, all_matches):
        for m in all_matches:
            missing = MATCH_KEYS - set(m.keys())
            assert not missing, f"Missing {missing} in {m.get('id')}"
            assert set(m["home"].keys()) >= TEAM_KEYS
            assert set(m["away"].keys()) >= TEAM_KEYS
            assert m["status"] in VALID_STATUSES, f"Bad status {m['status']}"
            # ISO parseable
            datetime.fromisoformat(m["kickoff"].replace("Z", "+00:00"))


# ---------- /api/matches (today only, 8) ----------
class TestMatchesToday:
    def test_returns_8(self, today_matches):
        assert len(today_matches) == 8

    def test_all_kickoffs_today(self, today_matches):
        today = datetime.utcnow().date()
        for m in today_matches:
            d = datetime.fromisoformat(m["kickoff"].replace("Z", "+00:00")).date()
            assert d == today, f"Match {m['id']} not today: {m['kickoff']}"


# ---------- /api/matches/tomorrow (4 quarter-finals) ----------
class TestMatchesTomorrow:
    def test_returns_4(self, tomorrow_matches):
        assert len(tomorrow_matches) == 4

    def test_all_quarter_finals(self, tomorrow_matches):
        for m in tomorrow_matches:
            assert m["stage"] == "Quarter-final", \
                f"Expected Quarter-final, got {m['stage']}"
            assert m["status"] == "scheduled"
            assert m["home_score"] is None
            assert m["away_score"] is None


# ---------- /api/matches/live (live OR halftime) ----------
class TestMatchesLive:
    def test_live_endpoint(self):
        r = requests.get(f"{API}/matches/live", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for m in data:
            assert m["status"] in ("live", "halftime"), \
                f"Unexpected status {m['status']}"

    def test_includes_halftime(self, all_matches):
        # m4 starts 50 minutes ago → should be halftime
        live_resp = requests.get(f"{API}/matches/live", timeout=15).json()
        live_ids = {m["id"] for m in live_resp}
        halftime_ids = {m["id"] for m in all_matches if m["status"] == "halftime"}
        for hid in halftime_ids:
            assert hid in live_ids, f"Halftime match {hid} missing from /live"


# ---------- Halftime status detection ----------
class TestHalftimeDetection:
    def test_m4_is_halftime(self, all_matches):
        m4 = next((m for m in all_matches if m["id"] == "m4"), None)
        assert m4 is not None, "m4 fixture missing"
        assert m4["status"] == "halftime", \
            f"m4 expected halftime, got {m4['status']}"
        assert m4["minute"] == 45, f"m4 minute should be 45, got {m4['minute']}"
        assert m4["home_score"] == 2
        assert m4["away_score"] == 1

    def test_m3_is_live(self, all_matches):
        m3 = next((m for m in all_matches if m["id"] == "m3"), None)
        assert m3 is not None
        assert m3["status"] == "live"
        assert isinstance(m3["minute"], int) and 1 <= m3["minute"] <= 90


# ---------- Status invariants ----------
class TestStatusInvariants:
    def test_scheduled_no_scores(self, all_matches):
        for m in all_matches:
            if m["status"] == "scheduled":
                assert m["home_score"] is None
                assert m["away_score"] is None
                assert m["minute"] is None

    def test_finished_has_scores_no_minute(self, all_matches):
        for m in all_matches:
            if m["status"] == "finished":
                assert isinstance(m["home_score"], int)
                assert isinstance(m["away_score"], int)
                assert m["minute"] is None

    def test_live_has_minute_and_scores(self, all_matches):
        for m in all_matches:
            if m["status"] == "live":
                assert isinstance(m["minute"], int)
                assert 1 <= m["minute"] <= 90
                assert isinstance(m["home_score"], int)
                assert isinstance(m["away_score"], int)


# ---------- /api/matches/next ----------
class TestMatchesNext:
    def test_next_is_earliest_scheduled(self, all_matches):
        scheduled = sorted(
            [m for m in all_matches if m["status"] == "scheduled"],
            key=lambda x: x["kickoff"],
        )
        nxt = requests.get(f"{API}/matches/next", timeout=15).json()
        assert nxt is not None
        assert nxt["id"] == scheduled[0]["id"]
        assert nxt["status"] == "scheduled"


# ---------- /api/groups ----------
class TestGroups:
    def test_returns_4_groups(self, groups):
        assert isinstance(groups, list)
        assert len(groups) == 4
        names = [g["name"] for g in groups]
        for expected in ("Group A", "Group B", "Group C", "Group D"):
            assert expected in names, f"{expected} missing"

    def test_each_group_has_4_teams(self, groups):
        for g in groups:
            assert len(g["standings"]) == 4, \
                f"{g['name']} has {len(g['standings'])} teams"

    def test_team_objects_structure(self, groups):
        for g in groups:
            for s in g["standings"]:
                assert set(s["team"].keys()) >= TEAM_KEYS
                for key in ("played", "wins", "draws", "losses",
                            "goals_for", "goals_against", "goal_diff", "points"):
                    assert key in s, f"Missing {key} in standings"
                    assert isinstance(s[key], int)

    def test_standings_sorted_by_points_then_gd(self, groups):
        for g in groups:
            standings = g["standings"]
            for i in range(len(standings) - 1):
                a, b = standings[i], standings[i + 1]
                # Must be sorted in non-increasing order by (points, goal_diff, goals_for)
                key_a = (a["points"], a["goal_diff"], a["goals_for"])
                key_b = (b["points"], b["goal_diff"], b["goals_for"])
                assert key_a >= key_b, \
                    f"{g['name']} not sorted between idx {i} and {i+1}"

    def test_points_calculation(self, groups):
        for g in groups:
            for s in g["standings"]:
                expected = s["wins"] * 3 + s["draws"]
                assert s["points"] == expected, \
                    f"{s['team']['short']} points mismatch"
                assert s["goal_diff"] == s["goals_for"] - s["goals_against"]


# ---------- Root ----------
class TestRoot:
    def test_api_root(self):
        r = requests.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        assert "message" in r.json()
