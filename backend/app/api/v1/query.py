"""POST /api/v1/query — Main teacher query endpoint."""
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis_client import check_rate_limit, get_cached_response, set_cached_response
from app.llm.claude_client import get_structured_advice
from app.llm.response_parser import (
    FALLBACK_RESPONSE_EN,
    FALLBACK_RESPONSE_HI,
    parse_claude_response,
)
from app.models.db_models import Session as SessionModel
from app.models.request import QueryRequest
from app.models.response import QueryResponse
from app.rag.context_builder import build_prompt
from app.rag.retrieval import get_hybrid_search

router = APIRouter()


@router.post("/query", response_model=QueryResponse)
async def query_endpoint(
    request: QueryRequest,
    db: AsyncSession = Depends(get_db),
) -> QueryResponse:
    """
    Main endpoint: teacher query → RAG → Claude → structured 5-block response.
    Applies rate limiting, Redis caching, and best-effort session persistence.
    """
    start_time = time.monotonic()

    # ── 1. Rate limiting (Redis) ───────────────────────────────────────────────
    is_allowed = await check_rate_limit(request.teacher_id)
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "rate_limit_exceeded",
                "message_hi": "आज की 30 बातचीत पूरी हो गईं। कल सुबह फिर मिलेंगे!",
                "message_en": "Daily limit of 30 queries reached. Come back tomorrow!",
            },
        )

    # ── 2. Redis response cache ────────────────────────────────────────────────
    cache_key = (
        f"query:{request.teacher_id}"
        f":{request.query_text[:100]}"
        f":{request.grade}:{request.subject}"
    )
    cached = await get_cached_response(cache_key)
    if cached:
        cached["session_id"] = str(uuid.uuid4())
        cached["from_cache"] = True
        return QueryResponse(**cached)

    # ── 3. Retrieve teacher's last 3 sessions for context continuity ───────────
    recent_sessions: list[dict] = []
    try:
        # Use explicit uuid.UUID cast to avoid asyncpg type-mismatch on WHERE clause
        teacher_uuid = uuid.UUID(request.teacher_id)
        result = await db.execute(
            select(SessionModel)
            .where(SessionModel.teacher_id == teacher_uuid)
            .order_by(SessionModel.created_at.desc())
            .limit(3)
        )
        recent_sessions = [
            {"query_text": s.query_text, "grade": s.grade, "subject": s.subject}
            for s in result.scalars().all()
        ]
    except Exception:
        pass  # History is enhancement only — never block on it

    # ── 4. RAG retrieval (hybrid dense + BM25) ────────────────────────────────
    chunks: list[dict] = []
    try:
        search = get_hybrid_search()
        chunks = search.search(
            query=request.query_text,
            grade=request.grade,
            subject=request.subject,
            top_k=5,
        )
    except Exception:
        pass  # Empty chunks → system prompt still works, just without grounding

    # ── 5. Build LLM prompt ───────────────────────────────────────────────────
    system_prompt = build_prompt(
        query=request.query_text,
        language=request.language,
        grade=request.grade,
        subject=request.subject,
        class_size=request.class_size,
        chunks=chunks,
        session_history=recent_sessions,
        special_context=request.special_context,
    )

    # ── 6. Call Claude (with graceful fallback) ────────────────────────────────
    session_id = str(uuid.uuid4())
    try:
        raw_response = await get_structured_advice(
            system_prompt=system_prompt,
            max_tokens=1200,
            temperature=0.3,
        )
    except Exception as e:
        print(f"⚠️  Claude API call failed (using fallback): {e}")
        raw_response = (
            FALLBACK_RESPONSE_HI if request.language == "hi" else FALLBACK_RESPONSE_EN
        )

    elapsed_ms = int((time.monotonic() - start_time) * 1000)

    # ── 7. Parse and validate the response ────────────────────────────────────
    response = parse_claude_response(raw_response, request.language, session_id, elapsed_ms)

    # ── 8. Persist session (best-effort — never block the teacher's response) ──
    try:
        teacher_uuid = uuid.UUID(request.teacher_id)
    except ValueError:
        teacher_uuid = uuid.uuid4()

    new_session = SessionModel(
        id=uuid.UUID(session_id),
        teacher_id=teacher_uuid,
        query_text=request.query_text,
        grade=request.grade,
        subject=request.subject,
        language=request.language,
        response=response.model_dump(),
        from_cache=False,
        response_time_ms=elapsed_ms,
    )
    try:
        db.add(new_session)
        await db.commit()
    except Exception as e:
        await db.rollback()
        # FK violation (teacher not in DB yet) is the most common cause.
        # Response is already built — log and continue.
        print(f"⚠️  Session persist skipped for {session_id}: {type(e).__name__}: {e}")

    # ── 9. Cache the successful response ──────────────────────────────────────
    await set_cached_response(cache_key, response.model_dump(), ttl=3600)

    return response