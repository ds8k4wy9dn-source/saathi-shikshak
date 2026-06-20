"""POST /api/v1/feedback — Record teacher's thumbs-up / thumbs-down on a response."""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis_client import invalidate_session_cache
from app.models.db_models import Session as SessionModel
from app.models.request import FeedbackRequest

router = APIRouter()


@router.post("/feedback")
async def submit_feedback(
    req: FeedbackRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Store feedback (1=helpful, 0=not helpful) against a session record."""

    # Validate UUID format first — return 400 rather than a cryptic DB error
    try:
        sid = uuid.UUID(req.session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id format")

    result = await db.execute(select(SessionModel).where(SessionModel.id == sid))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.feedback = req.feedback

    # Best-effort commit — same pattern as query.py; a DB hiccup
    # must not prevent the teacher from seeing the acknowledgement
    try:
        await db.commit()
        # Bust the Redis session cache so the next GET reflects the new feedback
        await invalidate_session_cache(str(session.teacher_id))
    except Exception as e:
        await db.rollback()
        print(f"⚠️  Feedback persist failed for {req.session_id}: {e}")

    return {"status": "ok"}