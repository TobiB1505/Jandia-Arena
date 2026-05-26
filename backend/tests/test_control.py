"""Backend tests for the Live-Control / Remote API (mobile admin → TV)."""
import os
from pathlib import Path

import pytest
import requests


def _load_backend_url() -> str:
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if url:
        return url.rstrip("/")
    env_path = Path(__file__).resolve().parents[2] / "frontend" / ".env"
    for line in env_path.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not set")


BASE = _load_backend_url()
API = f"{BASE}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def reset_control(session):
    """Each test starts with a clean control state."""
    session.post(f"{API}/control/screen/unpin", timeout=10)
    session.post(f"{API}/control/rotation/resume", timeout=10)
    session.post(f"{API}/control/overlays/hide", json={"hide": False}, timeout=10)
    yield
    session.post(f"{API}/control/screen/unpin", timeout=10)
    session.post(f"{API}/control/rotation/resume", timeout=10)
    session.post(f"{API}/control/overlays/hide", json={"hide": False}, timeout=10)


class TestControlState:
    def test_state_shape(self, session, reset_control):
        r = session.get(f"{API}/control/state", timeout=10)
        assert r.status_code == 200
        data = r.json()
        for k in ("rotation_paused", "pinned_screen", "forced_action",
                  "reload_token", "hide_overlays", "updated_at"):
            assert k in data
        assert data["rotation_paused"] is False
        assert data["pinned_screen"] is None
        assert data["hide_overlays"] is False
        assert isinstance(data["reload_token"], int)

    def test_pause_resume(self, session, reset_control):
        r = session.post(f"{API}/control/rotation/pause", timeout=10)
        assert r.json()["rotation_paused"] is True
        r = session.post(f"{API}/control/rotation/resume", timeout=10)
        assert r.json()["rotation_paused"] is False

    def test_pin_unpin_valid_screen(self, session, reset_control):
        r = session.post(f"{API}/control/screen/pin", json={"screen": "groups"}, timeout=10)
        assert r.json()["pinned_screen"] == "groups"
        r = session.post(f"{API}/control/screen/unpin", timeout=10)
        assert r.json()["pinned_screen"] is None

    def test_pin_unknown_screen_rejected(self, session, reset_control):
        r = session.post(f"{API}/control/screen/pin", json={"screen": "moon"}, timeout=10)
        body = r.json()
        assert body.get("ok") is False
        assert body.get("error") == "unknown_screen"
        # State must remain unpinned
        state = session.get(f"{API}/control/state", timeout=10).json()
        assert state["pinned_screen"] is None

    def test_show_emits_forced_action_with_token(self, session, reset_control):
        before = session.get(f"{API}/control/state", timeout=10).json()
        before_token = (before.get("forced_action") or {}).get("token", 0)

        r = session.post(f"{API}/control/screen/show", json={"screen": "germany"}, timeout=10)
        fa = r.json()["forced_action"]
        assert fa["type"] == "show"
        assert fa["screen"] == "germany"
        assert fa["token"] > before_token

    def test_next_previous_bump_token(self, session, reset_control):
        before = session.get(f"{API}/control/state", timeout=10).json()
        before_token = (before.get("forced_action") or {}).get("token", 0)
        n = session.post(f"{API}/control/screen/next", timeout=10).json()
        assert n["forced_action"]["type"] == "next"
        assert n["forced_action"]["token"] > before_token
        p = session.post(f"{API}/control/screen/previous", timeout=10).json()
        assert p["forced_action"]["type"] == "previous"
        assert p["forced_action"]["token"] > n["forced_action"]["token"]

    def test_reload_bumps_token(self, session, reset_control):
        before = session.get(f"{API}/control/state", timeout=10).json()
        before_t = before["reload_token"]
        r = session.post(f"{API}/control/tv/reload", timeout=10)
        assert r.json()["reload_token"] == before_t + 1

    def test_hide_overlays(self, session, reset_control):
        r = session.post(f"{API}/control/overlays/hide", json={"hide": True}, timeout=10)
        assert r.json()["hide_overlays"] is True
        r = session.post(f"{API}/control/overlays/hide", json={"hide": False}, timeout=10)
        assert r.json()["hide_overlays"] is False

    def test_state_persists_across_polls(self, session, reset_control):
        session.post(f"{API}/control/screen/pin", json={"screen": "today"}, timeout=10)
        session.post(f"{API}/control/rotation/pause", timeout=10)
        # Multiple GETs should keep returning the same state
        for _ in range(3):
            data = session.get(f"{API}/control/state", timeout=10).json()
            assert data["pinned_screen"] == "today"
            assert data["rotation_paused"] is True
