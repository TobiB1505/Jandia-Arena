"""Minimal admin auth (single shared password + HMAC-signed token).

Reads ADMIN_PASSWORD and ADMIN_SECRET from env. If either is missing the
gate is OPEN (dev mode) – useful for local hacking. In production both must
be set in backend/.env.

Token format:  base64url(payload).base64url(hmac_sha256(payload, secret))
Payload JSON:  {"iat": int, "exp": int}
"""

import os
import hmac
import json
import time
import base64
import hashlib

from fastapi import Header, HTTPException


TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60  # 7 days


def _admin_password() -> str:
    return os.environ.get("ADMIN_PASSWORD", "") or ""


def _admin_secret() -> str:
    return os.environ.get("ADMIN_SECRET", "") or ""


def auth_configured() -> bool:
    return bool(_admin_password()) and bool(_admin_secret())


def _b64u_enc(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode("ascii")


def _b64u_dec(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def _sign(body: str) -> str:
    sig = hmac.new(
        _admin_secret().encode("utf-8"),
        body.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return _b64u_enc(sig)


def issue_token() -> str:
    now = int(time.time())
    payload = {"iat": now, "exp": now + TOKEN_TTL_SECONDS}
    body = _b64u_enc(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    return f"{body}.{_sign(body)}"


def verify_token(token: str) -> bool:
    if not token or "." not in token:
        return False
    try:
        body, sig = token.split(".", 1)
        if not hmac.compare_digest(sig, _sign(body)):
            return False
        payload = json.loads(_b64u_dec(body))
        return int(payload.get("exp", 0)) > int(time.time())
    except Exception:
        return False


def check_password(plain: str) -> bool:
    expected = _admin_password()
    if not expected:
        return False
    return hmac.compare_digest(plain.encode("utf-8"), expected.encode("utf-8"))


def require_admin(authorization: str = Header(default="")):
    """FastAPI dependency. If auth is unconfigured the route stays open."""
    if not auth_configured():
        return True
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    token = authorization[7:].strip()
    if not verify_token(token):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return True
