"""Experts CRUD + image upload for the Jandia Arena TV dashboard."""
from __future__ import annotations

import os
import shutil
import uuid
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

load_dotenv(Path(__file__).parent / ".env")

_mongo_url = os.environ["MONGO_URL"]
_db_name = os.environ["DB_NAME"]
_client = AsyncIOMotorClient(_mongo_url)
_db = _client[_db_name]
_col = _db["experts"]

UPLOAD_DIR = Path(__file__).parent / "uploads" / "experts"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp"}
MAX_BYTES = 8 * 1024 * 1024  # 8 MB


# ---- Models ----
class Expert(BaseModel):
    id: str
    name: str
    period_from: str = ""   # "DD.MM."
    period_to: str = ""     # "DD.MM.YYYY"
    role: str = ""
    image_url: Optional[str] = None
    image_fit: str = "cover"     # "cover" | "contain"
    image_position: Optional[str] = None  # CSS object-position
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


# ---- CRUD ----
@router.get("", response_model=List[Expert])
async def list_experts():
    docs = await _col.find({}, {"_id": 0}).to_list(length=200)
    docs.sort(key=lambda d: (d.get("order", 0), d.get("name", "")))
    return [Expert(**d) for d in docs]


@router.put("/{expert_id}", response_model=Expert)
async def update_expert(expert_id: str, payload: ExpertUpdate):
    existing = await _col.find_one({"id": expert_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Experte nicht gefunden")
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        await _col.update_one({"id": expert_id}, {"$set": updates})
        existing.update(updates)
    return Expert(**existing)


@router.post("/{expert_id}/image", response_model=Expert)
async def upload_image(expert_id: str, file: UploadFile = File(...)):
    existing = await _col.find_one({"id": expert_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Experte nicht gefunden")

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXT:
        raise HTTPException(400, f"Format {suffix or '?'} nicht erlaubt. Erlaubt: jpg, png, webp")

    # Remove old uploaded file for this expert (if any) to avoid orphans.
    for old in UPLOAD_DIR.glob(f"{expert_id}.*"):
        try:
            old.unlink()
        except OSError:
            pass

    out_path = UPLOAD_DIR / f"{expert_id}{suffix}"
    total = 0
    with out_path.open("wb") as f:
        while True:
            chunk = await file.read(64 * 1024)
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_BYTES:
                f.close()
                out_path.unlink(missing_ok=True)
                raise HTTPException(413, "Datei zu groß (max. 8 MB)")
            f.write(chunk)

    # Cache-bust the URL so the frontend reloads it.
    public_url = f"/api/uploads/experts/{out_path.name}?v={uuid.uuid4().hex[:8]}"
    await _col.update_one({"id": expert_id}, {"$set": {"image_url": public_url}})
    existing["image_url"] = public_url
    return Expert(**existing)


@router.delete("/{expert_id}/image", response_model=Expert)
async def clear_image(expert_id: str):
    existing = await _col.find_one({"id": expert_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Experte nicht gefunden")
    for old in UPLOAD_DIR.glob(f"{expert_id}.*"):
        try:
            old.unlink()
        except OSError:
            pass
    await _col.update_one({"id": expert_id}, {"$set": {"image_url": None}})
    existing["image_url"] = None
    return Expert(**existing)


# ---- Seed defaults on first run ----
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


def mount_uploads_static(app) -> None:
    """Serve uploaded photos so the frontend can reference them."""
    # The directory may not exist yet on a fresh checkout
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    app.mount(
        "/api/uploads/experts",
        StaticFiles(directory=str(UPLOAD_DIR)),
        name="expert-uploads",
    )
