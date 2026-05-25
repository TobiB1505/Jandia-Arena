"""Lower Thirds admin CRUD + Auto-cycle settings.

Stored in MongoDB so config survives restarts. Single global settings doc
(id="global") and a collection of items. All IDs are UUID strings to avoid
ObjectId-serialization pitfalls.
"""
from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

# Ensure .env is loaded even if this module is imported before server.py
# finishes its own load_dotenv() call.
load_dotenv(Path(__file__).parent / ".env")


# ---- DB setup (uses the same MongoDB the rest of the app uses) ----
_mongo_url = os.environ["MONGO_URL"]
_db_name = os.environ["DB_NAME"]
_client = AsyncIOMotorClient(_mongo_url)
_db = _client[_db_name]
_items_col = _db["lower_thirds"]
_settings_col = _db["lower_thirds_settings"]
_SETTINGS_ID = "global"


VALID_VARIANTS = {"live", "studio", "preview", "halftime", "analysis"}
VALID_SCREENS = {"today", "next", "germany", "tomorrow", "schedule", "groups"}


# ---- Models ----
class LowerThird(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str = ""
    title: str
    subtitle: str = ""
    variant: str = "studio"
    active: bool = True
    order: int = 0
    screens: List[str] = Field(default_factory=list)
    # Optional pixel position inside the 1920x1080 broadcast stage.
    # null/None → fall back to the CSS default (centered, bottom: 96px).
    position_x: Optional[int] = None
    position_y: Optional[int] = None


class LowerThirdInput(BaseModel):
    label: str = ""
    title: str
    subtitle: str = ""
    variant: str = "studio"
    active: bool = True
    order: int = 0
    screens: List[str] = Field(default_factory=list)
    position_x: Optional[int] = None
    position_y: Optional[int] = None


class LowerThirdSettings(BaseModel):
    cycle_duration_ms: int = 25000


def _validate(variant: str, screens: List[str]) -> None:
    if variant not in VALID_VARIANTS:
        raise HTTPException(400, f"Ungültige Variante: {variant}")
    for s in screens:
        if s not in VALID_SCREENS:
            raise HTTPException(400, f"Ungültiger Screen: {s}")


# ---- Router ----
router = APIRouter(prefix="/api/lower-thirds", tags=["lower-thirds"])


@router.get("", response_model=List[LowerThird])
async def list_items():
    docs = await _items_col.find({}, {"_id": 0}).to_list(length=500)
    docs.sort(key=lambda d: (d.get("order", 0), d.get("title", "")))
    return [LowerThird(**d) for d in docs]


@router.post("", response_model=LowerThird)
async def create_item(payload: LowerThirdInput):
    _validate(payload.variant, payload.screens)
    item = LowerThird(**payload.model_dump())
    await _items_col.insert_one(item.model_dump())
    return item


@router.get("/settings", response_model=LowerThirdSettings)
async def get_settings():
    doc = await _settings_col.find_one({"_id": _SETTINGS_ID})
    if not doc:
        return LowerThirdSettings()
    return LowerThirdSettings(cycle_duration_ms=int(doc.get("cycle_duration_ms", 25000)))


@router.put("/settings", response_model=LowerThirdSettings)
async def update_settings(payload: LowerThirdSettings):
    if payload.cycle_duration_ms < 3000:
        raise HTTPException(400, "Mindestdauer 3000 ms")
    await _settings_col.update_one(
        {"_id": _SETTINGS_ID},
        {"$set": {"cycle_duration_ms": int(payload.cycle_duration_ms)}},
        upsert=True,
    )
    return payload


@router.put("/{item_id}", response_model=LowerThird)
async def update_item(item_id: str, payload: LowerThirdInput):
    _validate(payload.variant, payload.screens)
    existing = await _items_col.find_one({"id": item_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Lower Third nicht gefunden")
    updated = LowerThird(id=item_id, **payload.model_dump())
    await _items_col.replace_one({"id": item_id}, updated.model_dump())
    return updated


@router.delete("/{item_id}")
async def delete_item(item_id: str):
    res = await _items_col.delete_one({"id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Lower Third nicht gefunden")
    return {"ok": True}


class PositionInput(BaseModel):
    position_x: Optional[int] = None
    position_y: Optional[int] = None


@router.patch("/{item_id}/position", response_model=LowerThird)
async def patch_position(item_id: str, payload: PositionInput):
    """Lightweight endpoint used by the admin drag-and-drop editor.

    null values explicitly clear the stored coordinate (→ CSS default).
    Fields not present in the payload are left untouched.
    """
    existing = await _items_col.find_one({"id": item_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Lower Third nicht gefunden")
    sets = {}
    unsets = {}
    fields_set = payload.model_fields_set
    if "position_x" in fields_set:
        if payload.position_x is None:
            unsets["position_x"] = ""
            existing["position_x"] = None
        else:
            sets["position_x"] = max(0, min(1920, int(payload.position_x)))
            existing["position_x"] = sets["position_x"]
    if "position_y" in fields_set:
        if payload.position_y is None:
            unsets["position_y"] = ""
            existing["position_y"] = None
        else:
            sets["position_y"] = max(0, min(1080, int(payload.position_y)))
            existing["position_y"] = sets["position_y"]
    update_op = {}
    if sets:
        update_op["$set"] = sets
    if unsets:
        update_op["$unset"] = unsets
    if update_op:
        await _items_col.update_one({"id": item_id}, update_op)
    return LowerThird(**existing)


class ActiveInput(BaseModel):
    active: bool


@router.patch("/{item_id}/active", response_model=LowerThird)
async def patch_active(item_id: str, payload: ActiveInput):
    """Lightweight toggle so the admin doesn't need to send the full payload."""
    existing = await _items_col.find_one({"id": item_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Lower Third nicht gefunden")
    await _items_col.update_one({"id": item_id}, {"$set": {"active": bool(payload.active)}})
    existing["active"] = bool(payload.active)
    return LowerThird(**existing)


@router.get("/meta")
async def get_meta():
    """Helper for the admin UI: returns valid variants + screen ids in German."""
    return {
        "variants": [
            {"id": "live", "label": "LIVE"},
            {"id": "studio", "label": "Studio"},
            {"id": "preview", "label": "Vorschau"},
            {"id": "halftime", "label": "Halbzeit"},
            {"id": "analysis", "label": "Analyse"},
        ],
        "screens": [
            {"id": "today", "label": "Heute"},
            {"id": "next", "label": "Nächstes Spiel"},
            {"id": "germany", "label": "Deutschland Public Viewing"},
            {"id": "tomorrow", "label": "Morgen"},
            {"id": "schedule", "label": "Spielplan"},
            {"id": "groups", "label": "Gruppen"},
        ],
    }


async def seed_defaults_if_empty() -> None:
    """Pre-populate sensible default lower thirds on first run."""
    existing = await _items_col.count_documents({})
    if existing > 0:
        return
    defaults = [
        LowerThird(
            label="VORSCHAU",
            title="Deutschland im Fokus",
            subtitle="Public Viewing heute in der Jandia Arena",
            variant="preview",
            active=True,
            order=0,
            screens=["germany"],
        ),
        LowerThird(
            label="STUDIO",
            title="Jandia Arena Studio",
            subtitle="Live aus dem Public Viewing Bereich",
            variant="studio",
            active=False,
            order=1,
            screens=["today", "next"],
        ),
        LowerThird(
            label="ANALYSE",
            title="Experten-Talk",
            subtitle="Taktik, Emotionen und Stimmen aus der Arena",
            variant="analysis",
            active=False,
            order=2,
            screens=["groups"],
        ),
    ]
    await _items_col.insert_many([d.model_dump() for d in defaults])
