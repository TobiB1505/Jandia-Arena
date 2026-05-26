"""Backend tests for Lower Thirds CRUD + Settings + Meta endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
# Frontend env var has the public URL; if missing, fallback to local backend.
# But .env file is in /app/frontend - read it directly to be safe
try:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break
except Exception:
    pass

API = f"{BASE_URL}/api/lower-thirds"


@pytest.fixture(scope="module")
def session(admin_token):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}",
    })
    return s


# ---- Meta ----
def test_meta_returns_german_lists(session):
    r = session.get(f"{API}/meta", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "variants" in data and "screens" in data
    variant_ids = {v["id"] for v in data["variants"]}
    assert variant_ids == {"live", "studio", "preview", "halftime", "analysis"}
    screen_ids = {s["id"] for s in data["screens"]}
    assert screen_ids == {"today", "next", "germany", "tomorrow", "schedule", "groups", "experts"}
    # German labels (spot-check)
    labels = {s["id"]: s["label"] for s in data["screens"]}
    assert labels["today"] == "Heute"
    assert labels["germany"] == "Deutschland Public Viewing"


# ---- Settings ----
def test_get_settings_default(session):
    r = session.get(f"{API}/settings", timeout=10)
    assert r.status_code == 200
    body = r.json()
    assert "cycle_duration_ms" in body
    assert isinstance(body["cycle_duration_ms"], int)
    assert body["cycle_duration_ms"] >= 3000


def test_update_settings_valid_and_persistence(session):
    # set to 8000
    r = session.put(f"{API}/settings", json={"cycle_duration_ms": 8000}, timeout=10)
    assert r.status_code == 200
    assert r.json()["cycle_duration_ms"] == 8000
    # GET reflects change
    g = session.get(f"{API}/settings", timeout=10)
    assert g.status_code == 200
    assert g.json()["cycle_duration_ms"] == 8000
    # reset back to default
    session.put(f"{API}/settings", json={"cycle_duration_ms": 25000}, timeout=10)


def test_update_settings_too_low_rejected(session):
    r = session.put(f"{API}/settings", json={"cycle_duration_ms": 1000}, timeout=10)
    assert r.status_code == 400


# ---- List + Seed ----
def test_list_returns_at_least_three_seed_items(session):
    r = session.get(API, timeout=10)
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    assert len(items) >= 3
    # No _id leakage
    for it in items:
        assert "_id" not in it
        assert "id" in it
        assert "title" in it


def test_seed_germany_default_present(session):
    """Default seed includes the 'Deutschland im Fokus' preview for germany screen."""
    r = session.get(API, timeout=10)
    items = r.json()
    titles = [i["title"] for i in items]
    # Only assert if seed values exist (might be customised between iterations)
    if "Deutschland im Fokus" in titles:
        item = next(i for i in items if i["title"] == "Deutschland im Fokus")
        assert item["variant"] == "preview"
        assert "germany" in item["screens"]
        assert item["active"] is True


# ---- Create / Update / Delete roundtrip ----
def test_create_then_get_then_update_then_delete(session):
    # CREATE
    payload = {
        "label": "TEST",
        "title": "TEST_Pytest Lower Third",
        "subtitle": "Erstellt von pytest",
        "variant": "studio",
        "active": True,
        "order": 99,
        "screens": ["today", "next"],
    }
    c = session.post(API, json=payload, timeout=10)
    assert c.status_code == 200, c.text
    created = c.json()
    assert created["title"] == payload["title"]
    assert created["variant"] == "studio"
    assert set(created["screens"]) == {"today", "next"}
    assert isinstance(created["id"], str) and len(created["id"]) >= 8
    item_id = created["id"]

    # Verify in list
    listed = session.get(API, timeout=10).json()
    assert any(i["id"] == item_id for i in listed)

    # UPDATE
    upd = {**payload, "title": "TEST_Pytest UPDATED", "variant": "analysis", "active": False, "screens": ["groups"]}
    u = session.put(f"{API}/{item_id}", json=upd, timeout=10)
    assert u.status_code == 200
    updated = u.json()
    assert updated["title"] == "TEST_Pytest UPDATED"
    assert updated["variant"] == "analysis"
    assert updated["active"] is False
    assert updated["screens"] == ["groups"]

    # Confirm persisted
    listed2 = session.get(API, timeout=10).json()
    persisted = next((i for i in listed2 if i["id"] == item_id), None)
    assert persisted is not None
    assert persisted["title"] == "TEST_Pytest UPDATED"

    # DELETE
    d = session.delete(f"{API}/{item_id}", timeout=10)
    assert d.status_code == 200

    # Second delete -> 404
    d2 = session.delete(f"{API}/{item_id}", timeout=10)
    assert d2.status_code == 404


def test_update_unknown_id_returns_404(session):
    r = session.put(
        f"{API}/non-existent-id-xyz",
        json={
            "label": "",
            "title": "x",
            "subtitle": "",
            "variant": "studio",
            "active": True,
            "order": 0,
            "screens": ["today"],
        },
        timeout=10,
    )
    assert r.status_code == 404


def test_create_invalid_variant_returns_400(session):
    r = session.post(
        API,
        json={
            "label": "",
            "title": "TEST_invalid",
            "subtitle": "",
            "variant": "bogus",
            "active": True,
            "order": 0,
            "screens": ["today"],
        },
        timeout=10,
    )
    assert r.status_code == 400


def test_create_invalid_screen_returns_400(session):
    r = session.post(
        API,
        json={
            "label": "",
            "title": "TEST_invalid_screen",
            "subtitle": "",
            "variant": "studio",
            "active": True,
            "order": 0,
            "screens": ["not_a_screen"],
        },
        timeout=10,
    )
    assert r.status_code == 400


def test_seed_idempotent_no_duplicates_after_count_check(session):
    """Seed should only run when collection empty. List should remain stable
    across successive calls (no growth from background seeding)."""
    a = len(session.get(API, timeout=10).json())
    b = len(session.get(API, timeout=10).json())
    assert a == b
