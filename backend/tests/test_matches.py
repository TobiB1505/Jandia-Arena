"""Backend API tests for Jandia Arena TV Dashboard."""
import os
from datetime import datetime

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://match-hub-tv.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def matches():
    r = requests.get(f"{API}/matches", timeout=15)
    assert r.status_code == 200, r.text
    return r.json()


# ---- /api/matches ----
class TestMatches:
    def test_matches_returns_8(self, matches):
        assert isinstance(matches, list)
        assert len(matches) == 8

    def test_match_structure(self, matches):
        required_top = {"id", "stage", "venue", "kickoff", "status", "home", "away", "home_score", "away_score"}
        team_keys = {"code", "name", "short"}
        for m in matches:
            missing = required_top - set(m.keys())
            assert not missing, f"Missing keys {missing} in match {m.get('id')}"
            assert set(m["home"].keys()) >= team_keys
            assert set(m["away"].keys()) >= team_keys
            # kickoff is parseable ISO
            datetime.fromisoformat(m["kickoff"].replace("Z", "+00:00"))
            assert m["status"] in {"scheduled", "live", "finished"}

    def test_status_distribution(self, matches):
        live = [m for m in matches if m["status"] == "live"]
        finished = [m for m in matches if m["status"] == "finished"]
        scheduled = [m for m in matches if m["status"] == "scheduled"]
        # Demo schedule designed to always have at least one live, one finished, and several scheduled
        assert len(live) >= 1, "Expected at least one live match"
        assert len(finished) >= 1, "Expected at least one finished match"
        assert len(scheduled) >= 1, "Expected at least one scheduled match"

    def test_live_has_minute_and_scores(self, matches):
        for m in matches:
            if m["status"] == "live":
                assert isinstance(m.get("minute"), int) and 1 <= m["minute"] <= 90
                assert isinstance(m.get("home_score"), int)
                assert isinstance(m.get("away_score"), int)

    def test_finished_has_scores_no_minute(self, matches):
        for m in matches:
            if m["status"] == "finished":
                assert m.get("minute") is None
                assert isinstance(m.get("home_score"), int)
                assert isinstance(m.get("away_score"), int)

    def test_scheduled_has_null_scores(self, matches):
        for m in matches:
            if m["status"] == "scheduled":
                assert m.get("home_score") is None
                assert m.get("away_score") is None
                assert m.get("minute") is None


# ---- /api/matches/live ----
class TestLive:
    def test_live_endpoint(self):
        r = requests.get(f"{API}/matches/live", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for m in data:
            assert m["status"] == "live"


# ---- /api/matches/next ----
class TestNext:
    def test_next_endpoint(self):
        r = requests.get(f"{API}/matches/next", timeout=15)
        assert r.status_code == 200
        data = r.json()
        # Could be null but in demo schedule should exist
        assert data is not None, "Expected a next scheduled match in demo data"
        assert data["status"] == "scheduled"

    def test_next_is_earliest_scheduled(self):
        all_r = requests.get(f"{API}/matches", timeout=15).json()
        scheduled = sorted(
            [m for m in all_r if m["status"] == "scheduled"], key=lambda x: x["kickoff"]
        )
        nxt = requests.get(f"{API}/matches/next", timeout=15).json()
        assert nxt["id"] == scheduled[0]["id"]


# ---- /api/matches/finished ----
class TestFinished:
    def test_finished_endpoint(self):
        r = requests.get(f"{API}/matches/finished", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for m in data:
            assert m["status"] == "finished"
            assert m.get("home_score") is not None
            assert m.get("away_score") is not None


# ---- Root ----
class TestRoot:
    def test_api_root(self):
        r = requests.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        assert "message" in r.json()
