"""History API routes."""

import logging
from fastapi import APIRouter, HTTPException
from app.models.schemas import HistoryItem, HistoryDetail
from app.models.database import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["history"])


@router.get("/history", response_model=list[HistoryItem])
async def get_history(limit: int = 50):
    """Get recent analysis history."""
    items = await db.get_history(limit=limit)
    return [HistoryItem(**item) for item in items]


@router.get("/history/{analysis_id}")
async def get_analysis(analysis_id: str):
    """Get a specific analysis result."""
    item = await db.get_analysis(analysis_id)
    if not item:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return item
