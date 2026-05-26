"""Backend tests for the Germany-Live-Lock pipeline.

Covers:
  • Cache TTL adapts when fixtures contain a live match
  • `_matches_have_live` heuristic
  • Rate-limit guard exposure via /api/source
  • Simulate-date runtime override endpoints (set / live / reset)
  • /api/now reflects override changes immediately
"""
import os
import sys
import time
from pathlib import Path

import pytest
import requests

# Allow direct imports of backend modules for unit-level tests
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import football_api  # noqa: E402


def _load_backend_url() -> str:
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if url:
        return url.rstrip("/")
    env_path = Path(__file__).resolve().parents[2] / "frontend" / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not set")


BASE = _load_backend_url()
API = f"{BASE}/api"


@pytest.fixture(scope="module")
def session(admin_token):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}",
    })
    return s


# ============================================================
# Unit tests – football_api cache / live-detection logic
# ============================================================
class TestMatchesHaveLive:
    def test_empty_list_is_not_live(self):
        assert football_api._matches_have_live([]) is False

    def test_non_list_is_not_live(self):
        assert football_api._matches_have_live(None) is False
        assert football_api._matches_have_live({"status": "live"}) is False
        assert football_api._matches_have_live("live") is False

    def test_scheduled_only_is_not_live(self):
        data = [{"status": "scheduled"}, {"status": "finished"}]
        assert football_api._matches_have_live(data) is False

    def test_detects_in_play(self):
        data = [{"status": "scheduled"}, {"status": "in_play"}]
        assert football_api._matches_have_live(data) is True

    def test_detects_live(self):
        assert football_api._matches_have_live([{"status": "live"}]) is True

    def test_detects_halftime(self):
        assert football_api._matches_have_live([{"status": "halftime"}]) is True

    def test_detects_paused(self):
        assert football_api._matches_have_live([{"status": "paused"}]) is True

    def test_ignores_non_dict_items(self):
        data = [None, "live", {"status": "live"}]
        assert football_api._matches_have_live(data) is True


class TestCacheTTLAdapts:
    """The cache must use the shorter TTL when its stored value contains a
    live match, and the regular TTL otherwise."""

    def setup_method(self):
        football_api.cache_clear()

    def test_non_live_uses_regular_ttl(self):
        scheduled = [{"status": "scheduled"}, {"status": "finished"}]
        football_api._cache_set("test_key", scheduled)

        # Within regular TTL → returns value
        result = football_api._cache_get(
            "test_key",
            ttl=football_api.CACHE_TTL_FIXTURES,
            live_ttl=football_api.CACHE_TTL_FIXTURES_LIVE,
        )
        assert result == scheduled

    def test_live_uses_shorter_ttl(self):
        """Entry containing a live match should expire after live_ttl, not regular ttl."""
        live = [{"status": "live"}, {"status": "scheduled"}]
        football_api._cache_set("test_key_live", live)

        # Manually age the entry to just over the live TTL but under regular TTL
        ts, value, has_live = football_api._cache[ "test_key_live"]
        assert has_live is True
        # Push timestamp into the past so cache age > live_ttl but < regular ttl
        football_api._cache["test_key_live"] = (
            ts - football_api.CACHE_TTL_FIXTURES_LIVE - 1,
            value,
            has_live,
        )

        result = football_api._cache_get(
            "test_key_live",
            ttl=football_api.CACHE_TTL_FIXTURES,
            live_ttl=football_api.CACHE_TTL_FIXTURES_LIVE,
        )
        # Should be expired under live TTL even though regular TTL hasn't elapsed
        assert result is None

    def test_non_live_survives_past_live_ttl(self):
        """Inverse: a non-live entry must NOT be expired by the live TTL."""
        scheduled = [{"status": "scheduled"}]
        football_api._cache_set("test_key_nl", scheduled)

        ts, value, has_live = football_api._cache["test_key_nl"]
        assert has_live is False
        # Age past live_ttl but well under regular ttl
        football_api._cache["test_key_nl"] = (
            ts - football_api.CACHE_TTL_FIXTURES_LIVE - 5,
            value,
            has_live,
        )

        result = football_api._cache_get(
            "test_key_nl",
            ttl=football_api.CACHE_TTL_FIXTURES,
            live_ttl=football_api.CACHE_TTL_FIXTURES_LIVE,
        )
        assert result == scheduled  # still fresh under regular TTL

    def test_cache_clear_wipes_all(self):
        football_api._cache_set("a", [{"status": "scheduled"}])
        football_api._cache_set("b", [{"status": "live"}])
        assert len(football_api._cache) >= 2
        football_api.cache_clear()
        assert len(football_api._cache) == 0


class TestRateLimitGuard:
    def setup_method(self):
        football_api._call_log.clear()

    def test_call_stats_initial(self):
        stats = football_api.get_call_stats()
        assert stats["calls_last_60s"] == 0
        assert stats["limit_per_minute"] == football_api.RATE_LIMIT_MAX_CALLS
        assert stats["limit_documented"] == 10

    def test_old_calls_pruned(self):
        now = time.time()
        football_api._call_log.extend([now - 120, now - 90, now - 10, now - 5])
        stats = football_api.get_call_stats()
        # Only the two within last 60s should remain
        assert stats["calls_last_60s"] == 2


# ============================================================
# HTTP integration tests – simulate-date override + /api/source
# ============================================================
@pytest.fixture
def reset_simulate_date(session):
    """Ensure each test starts with no runtime override (env fallback)."""
    session.delete(f"{API}/settings/simulate-date", timeout=10)
    yield
    # Restore to .env default after the test
    session.delete(f"{API}/settings/simulate-date", timeout=10)


class TestSimulateDateEndpoints:
    def test_get_initial_state(self, session, reset_simulate_date):
        r = session.get(f"{API}/settings/simulate-date", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "effective_date" in data
        assert "live" in data
        assert "source" in data
        assert "env_value" in data
        assert "override" in data
        assert data["override"] is None
        # source should be either "env" or "live" depending on .env
        assert data["source"] in {"env", "live"}

    def test_put_sets_simulated_date(self, session, reset_simulate_date):
        r = session.put(
            f"{API}/settings/simulate-date",
            json={"date": "2026-06-20"},
            timeout=10,
        )
        assert r.status_code == 200
        data = r.json()
        assert data["effective_date"] == "2026-06-20"
        assert data["live"] is False
        assert data["source"] == "runtime_simulated"
        assert data["override"] == "2026-06-20"

        # Verify /api/now reflects the new date immediately
        nr = session.get(f"{API}/now", timeout=10)
        assert nr.json()["date"] == "2026-06-20"
        assert nr.json()["simulated"] is True

    def test_put_invalid_date_rejected(self, session, reset_simulate_date):
        r = session.put(
            f"{API}/settings/simulate-date",
            json={"date": "not-a-date"},
            timeout=10,
        )
        assert r.status_code == 200
        body = r.json()
        assert body.get("ok") is False
        assert body.get("error") == "invalid_date_format"

    def test_post_enables_live_mode(self, session, reset_simulate_date):
        r = session.post(f"{API}/settings/simulate-date/live", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["live"] is True
        assert data["effective_date"] == ""
        assert data["source"] == "runtime_live"
        assert data["override"] == ""

        # /api/now should now report real time (simulated=False)
        nr = session.get(f"{API}/now", timeout=10)
        assert nr.json()["simulated"] is False

    def test_delete_removes_override(self, session, reset_simulate_date):
        # First set an override
        session.put(
            f"{API}/settings/simulate-date",
            json={"date": "2026-06-20"},
            timeout=10,
        )
        # Then delete it
        r = session.delete(f"{API}/settings/simulate-date", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["override"] is None
        # Falls back to env (or live if env is empty)
        assert data["source"] in {"env", "live"}

    def test_state_persists_across_polls(self, session, reset_simulate_date):
        """Setting an override must survive multiple GET calls (in-memory state)."""
        session.put(
            f"{API}/settings/simulate-date",
            json={"date": "2027-01-01"},
            timeout=10,
        )
        for _ in range(3):
            r = session.get(f"{API}/settings/simulate-date", timeout=10)
            assert r.json()["effective_date"] == "2027-01-01"


class TestSourceEndpointExposesRateLimit:
    def test_source_contains_rate_limit_block(self, session):
        r = session.get(f"{API}/source", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "rate_limit" in data
        rl = data["rate_limit"]
        assert "calls_last_60s" in rl
        assert "limit_per_minute" in rl
        assert "limit_documented" in rl
        assert rl["limit_documented"] == 10
        assert isinstance(rl["calls_last_60s"], int)
        assert rl["calls_last_60s"] >= 0

    def test_source_basic_fields(self, session):
        r = session.get(f"{API}/source", timeout=10)
        data = r.json()
        assert data["matches"] in {"api", "demo"}
        assert data["groups"] in {"api", "demo"}
        assert isinstance(data["api_configured"], bool)
