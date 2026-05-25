"""Experts CRUD + image upload, backed by Emergent Object Storage so files
survive container restarts and deployments.

External press photo URLs (e.g. customer-assets.emergentagent.com) are stored
as-is in `image_url`. Uploaded photos are pushed to object storage and the
public `image_url` becomes `/api/experts/{id}/photo` which proxies them.
"""
from __future__ import annotations

import logging
import mimetypes
import os
import uuid
from pathlib import Path
from typing import List, Optional

import requests
from dotenv import load_dotenv
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

load_dotenv(Path(__file__).parent / ".env")

_mongo_url = os.environ["MONGO_URL"]
_db_name = os.environ["DB_NAME"]
_client = AsyncIOMotorClient(_mongo_url)
_db = _client[_db_name]
_col = _db["experts"]

ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp"}
MAX_BYTES = 8 * 1024 * 1024  # 8 MB

# ---- Emergent Object Storage ----
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "jandia-arena"
_storage_key: Optional[str] = None
_log = logging.getLogger(__name__)


def init_storage() -> str:
    """Initialize once and cache the storage_key for the process lifetime."""
    global _storage_key
    if _storage_key:
        return _storage_key
    if not EMERGENT_KEY:
        raise RuntimeError("EMERGENT_LLM_KEY missing in environment")
    resp = requests.post(
        f"{STORAGE_URL}/init",
        json={"emergent_key": EMERGENT_KEY},
        timeout=30,
    )
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def _put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    if resp.status_code == 403:
        # Token expired – re-init once and retry
        globals()["_storage_key"] = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def _get_object(path: str) -> tuple[bytes, str]:
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60,
    )
    if resp.status_code == 403:
        globals()["_storage_key"] = None
        key = init_storage()
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key},
            timeout=60,
        )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---- Models ----
class Expert(BaseModel):
    id: str
    name: str
    period_from: str = ""
    period_to: str = ""
    role: str = ""
    image_url: Optional[str] = None
    image_fit: str = "cover"
    image_position: Optional[str] = None
    order: int = 0


class ExpertUpdate(BaseModel):
    name: Optional[str] = None
    period_from: Optional[str] = None
    period_to: Optional[str] = None
    role: Optional[str] = None
    image_url: Optional[str] = None
    image_fit: Optional[str] = None
    image_position: Optional[str] = None
    order: Optional[int] = None


router = APIRouter(prefix="/api/experts", tags=["experts"])


def _serialize(doc: dict) -> Expert:
    """Hide internal fields from the public response."""
    public = {k: v for k, v in doc.items() if k not in ("_id", "storage_path", "storage_ct")}
    return Expert(**public)


# ---- CRUD ----
@router.get("", response_model=List[Expert])
async def list_experts():
    docs = await _col.find({}).to_list(length=200)
    docs.sort(key=lambda d: (d.get("order", 0), d.get("name", "")))
    return [_serialize(d) for d in docs]


@router.put("/{expert_id}", response_model=Expert)
async def update_expert(expert_id: str, payload: ExpertUpdate):
    existing = await _col.find_one({"id": expert_id})
    if not existing:
        raise HTTPException(404, "Experte nicht gefunden")
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    # Setting image_url manually means the operator pointed at an external URL.
    # Drop the object-storage reference so the proxy endpoint stops serving
    # the stale upload.
    if "image_url" in updates:
        updates["storage_path"] = None
        updates["storage_ct"] = None
    if updates:
        await _col.update_one({"id": expert_id}, {"$set": updates})
        existing.update(updates)
    return _serialize(existing)


@router.post("/{expert_id}/image", response_model=Expert)
async def upload_image(expert_id: str, file: UploadFile = File(...)):
    existing = await _col.find_one({"id": expert_id})
    if not existing:
        raise HTTPException(404, "Experte nicht gefunden")

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXT:
        raise HTTPException(400, f"Format {suffix or '?'} nicht erlaubt. Erlaubt: jpg, png, webp")

    contents = bytearray()
    while True:
        chunk = await file.read(64 * 1024)
        if not chunk:
            break
        contents.extend(chunk)
        if len(contents) > MAX_BYTES:
            raise HTTPException(413, "Datei zu groß (max. 8 MB)")

    content_type = (
        file.content_type
        or mimetypes.guess_type(file.filename or "")[0]
        or "application/octet-stream"
    )
    # UUID prevents 409 conflicts and lets us treat uploads as immutable
    storage_path = f"{APP_NAME}/experts/{expert_id}/{uuid.uuid4().hex}{suffix}"

    try:
        result = _put_object(storage_path, bytes(contents), content_type)
    except Exception as e:
        _log.exception("Object storage upload failed")
        raise HTTPException(502, f"Upload zum Object Storage fehlgeschlagen: {e}")

    canonical = result.get("path", storage_path)
    # Cache-bust the public URL so browsers reload the new photo immediately.
    public_url = f"/api/experts/{expert_id}/photo?v={uuid.uuid4().hex[:8]}"
    await _col.update_one(
        {"id": expert_id},
        {
            "$set": {
                "storage_path": canonical,
                "storage_ct": content_type,
                "image_url": public_url,
            }
        },
    )
    existing["storage_path"] = canonical
    existing["storage_ct"] = content_type
    existing["image_url"] = public_url
    return _serialize(existing)


@router.delete("/{expert_id}/image", response_model=Expert)
async def clear_image(expert_id: str):
    existing = await _col.find_one({"id": expert_id})
    if not existing:
        raise HTTPException(404, "Experte nicht gefunden")
    # Object storage has no delete API – we just drop the DB reference. The
    # blob stays until the bucket lifecycle is cleaned up.
    await _col.update_one(
        {"id": expert_id},
        {"$set": {"storage_path": None, "storage_ct": None, "image_url": None}},
    )
    existing["storage_path"] = None
    existing["storage_ct"] = None
    existing["image_url"] = None
    return _serialize(existing)


@router.get("/{expert_id}/photo")
async def get_photo(expert_id: str):
    """Public proxy that streams the stored photo so <img src> works without
    any auth header or expiring presigned URL."""
    doc = await _col.find_one({"id": expert_id})
    if not doc:
        raise HTTPException(404, "Experte nicht gefunden")
    storage_path = doc.get("storage_path")
    if not storage_path:
        raise HTTPException(404, "Kein Foto hinterlegt")
    try:
        data, ct = _get_object(storage_path)
    except Exception as e:
        _log.exception("Object storage fetch failed")
        raise HTTPException(502, f"Foto konnte nicht geladen werden: {e}")
    return Response(
        content=data,
        media_type=doc.get("storage_ct") or ct,
        headers={"Cache-Control": "public, max-age=300"},
    )


# ---- Seed defaults on first run (with external URLs – no upload required) ----
DEFAULTS: List[dict] = [
    {"id": "patrick-schmidt", "name": "Patrick Schmidt",
     "period_from": "09.06.", "period_to": "20.06.2026",
     "role": "Ehemaliger DFB-Juniorennationalspieler · Stürmer",
     "image_url": "https://customer-assets.emergentagent.com/job_de479bdb-7280-45ae-b625-da94099aba40/artifacts/16atujkc_Patrick%20Schmidt.jpg",
     "image_fit": "cover", "image_position": None, "order": 0},
    {"id": "friedhelm-funkel", "name": "Friedhelm Funkel",
     "period_from": "10.06.", "period_to": "26.06.2026",
     "role": "DFB-Pokalsieger 1985 · 320 Bundesliga-Spiele",
     "image_url": "https://customer-assets.emergentagent.com/job_de479bdb-7280-45ae-b625-da94099aba40/artifacts/tq8oo8li_Friedhelm%20Funkel.jpg",
     "image_fit": "cover", "image_position": None, "order": 1},
    {"id": "michael-reschke", "name": "Michael Reschke",
     "period_from": "25.06.", "period_to": "06.07.2026",
     "role": "Ex-Sportdirektor Bayern, Leverkusen & VfB Stuttgart",
     "image_url": "https://customer-assets.emergentagent.com/job_de479bdb-7280-45ae-b625-da94099aba40/artifacts/v9ox199u_Michael_reschke.jpg",
     "image_fit": "cover", "image_position": "center 35%", "order": 2},
    {"id": "stefan-schnoor", "name": "Stefan Schnoor",
     "period_from": "25.06.", "period_to": "09.07.2026",
     "role": "277 Bundesliga-Spiele · 15 Tore · Premier-League-Erfahrung",
     "image_url": "https://customer-assets.emergentagent.com/job_de479bdb-7280-45ae-b625-da94099aba40/artifacts/ss8xehak_Stefan%20Schnoor.webp",
     "image_fit": "contain", "image_position": None, "order": 3},
    {"id": "daniela-fuss", "name": "Daniela Fuß",
     "period_from": "24.06.", "period_to": "09.07.2026",
     "role": "Sportmoderatorin · DSF/Sport1, RTL & ProSieben",
     "image_url": "https://customer-assets.emergentagent.com/job_de479bdb-7280-45ae-b625-da94099aba40/artifacts/tmcx5zxt_Daniela%20Fu%C3%9F.jpg",
     "image_fit": "cover", "image_position": "left center", "order": 4},
    {"id": "hansi-kuepper", "name": "Hansi Küpper",
     "period_from": "20.06.", "period_to": "27.06.2026",
     "role": "Kommentatoren-Legende · Sky, Sat.1, Champions League",
     "image_url": "https://customer-assets.emergentagent.com/job_de479bdb-7280-45ae-b625-da94099aba40/artifacts/hlefm6j7_Hansi%20Kuepper.jpg",
     "image_fit": "cover", "image_position": None, "order": 5},
    {"id": "kevin-grosskreutz", "name": "Kevin Großkreutz",
     "period_from": "22.06.", "period_to": "29.06.2026",
     "role": "Weltmeister 2014 · 2× Deutscher Meister · DFB-Pokalsieger",
     "image_url": "https://customer-assets.emergentagent.com/job_de479bdb-7280-45ae-b625-da94099aba40/artifacts/l8phd0b7_Kevin%20Grosskreutz.jpg",
     "image_fit": "cover", "image_position": "left center", "order": 6},
    {"id": "jan-stecker", "name": "Jan Stecker",
     "period_from": "10.07.", "period_to": "20.07.2026",
     "role": "RTL-/NFL-Moderator · Sportexperte & Kommentator",
     "image_url": "https://customer-assets.emergentagent.com/job_de479bdb-7280-45ae-b625-da94099aba40/artifacts/5fx8cukk_Jan%20Stecker.jpg",
     "image_fit": "cover", "image_position": "left center", "order": 7},
    {"id": "holger-fach", "name": "Holger Fach",
     "period_from": "10.07.", "period_to": "20.07.2026",
     "role": "Ex-Bundesligaprofi · 5 A-Länderspiele · DFB-Pokalsieger",
     "image_url": "https://customer-assets.emergentagent.com/job_de479bdb-7280-45ae-b625-da94099aba40/artifacts/nhgnhyy5_Holger%20Fach.jpg",
     "image_fit": "cover", "image_position": None, "order": 8},
]


async def seed_defaults_if_empty() -> None:
    if await _col.count_documents({}) > 0:
        return
    await _col.insert_many(DEFAULTS)


def init_storage_safe() -> None:
    """Best-effort init at startup so issues are visible in logs early."""
    try:
        init_storage()
        _log.info("Object storage initialized")
    except Exception as e:
        _log.warning("Object storage init deferred: %s", e)
