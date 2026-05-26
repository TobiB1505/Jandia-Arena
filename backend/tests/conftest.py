"""Shared pytest fixtures.

`admin_session` is a requests.Session pre-authenticated with the admin
password (loaded from backend/.env). All tests against write endpoints
should use this session. Read-only tests can continue to use a plain
`requests.get`.
"""
import os
from pathlib import Path

import pytest
import requests


def _backend_url() -> str:
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if url:
        return url.rstrip("/")
    env_path = Path(__file__).resolve().parents[2] / "frontend" / ".env"
    for line in env_path.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not set")


def _admin_password() -> str:
    pw = os.environ.get("ADMIN_PASSWORD")
    if pw:
        return pw
    env_path = Path(__file__).resolve().parents[1] / ".env"
    for line in env_path.read_text().splitlines():
        if line.startswith("ADMIN_PASSWORD="):
            return line.split("=", 1)[1].strip().strip('"')
    return ""


@pytest.fixture(scope="session")
def backend_url() -> str:
    return _backend_url()


@pytest.fixture(scope="session")
def admin_token(backend_url) -> str:
    pw = _admin_password()
    r = requests.post(
        f"{backend_url}/api/admin/login",
        json={"password": pw},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_session(admin_token, backend_url):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}",
    })
    return s
