"""GET /api/v1/session/{teacher_id} — Teacher session history."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis_client import get_session_cache, set_session_cache
from app.models.db_models import Session as SessionModel
from app.models.response import SessionRecord

router = APIRouter()


@router.get("/session/{teacher_id}", response_model=list[SessionRecord])
async def get_sessions(
    teacher_id: str,
    limit: int = Query(default=20, le=50),
    db: AsyncSession = Depends(get_db),
) -> list[SessionRecord]:
    """Return the last `limit` sessions for a teacher. Redis-cached for 1 hour."""

    # ── Cache hit ─────────────────────────────────────────────────────────────
    cached = await get_session_cache(teacher_id)
    if cached:
        return [SessionRecord(**s) for s in cached[:limit]]

    # ── DB query ──────────────────────────────────────────────────────────────
    result = await db.execute(
        select(SessionModel)
        .where(SessionModel.teacher_id == teacher_id)
        .order_by(SessionModel.created_at.desc())
        .limit(limit)
    )
    rows = result.scalars().all()

    records = [
        SessionRecord(
            session_id=str(s.id),
            query_text=s.query_text,
            grade=s.grade,
            subject=s.subject,
            language=s.language,
            created_at=s.created_at.isoformat(),
            feedback=s.feedback,
            # First immediate step, truncated — used as preview card text
            response_preview=(
                (s.response.get("immediate_steps", {}).get("steps") or [""])[0][:100]
            ),
        )
        for s in rows
    ]

    # ── Populate cache ────────────────────────────────────────────────────────
    await set_session_cache(teacher_id, [r.model_dump() for r in records])
    return records