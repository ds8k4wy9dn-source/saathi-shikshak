"""Async SQLAlchemy engine, session factory, and FastAPI DB dependency."""
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    """
    FastAPI dependency: yields an async DB session.

    Does NOT auto-commit. Every route handler that writes to the DB must call
    `await db.commit()` explicitly within its own try/except block. This makes
    commit/rollback ownership unambiguous:

        db.add(obj)
        try:
            await db.commit()
        except Exception as e:
            await db.rollback()
            # handle or re-raise

    Read-only GET handlers (session.py, scenarios.py) need no commit.
    If an unhandled exception propagates out of the route, this dependency
    rolls back the session before closing it.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def init_db() -> None:
    """Create all tables defined in ORM models. Called at application startup."""
    from app.models import db_models  # noqa: F401 — registers models with Base

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"\n❌ DATABASE STARTUP FAILED: {type(e).__name__}: {e}")
        print("   Most likely cause: PostgreSQL is not running.")
        print("   Fix:  brew services start postgresql@17")
        print("   Check: brew services list | grep postgresql\n")
        raise  # Server cannot function without DB — propagate to abort startup