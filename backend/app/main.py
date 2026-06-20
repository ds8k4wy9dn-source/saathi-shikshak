"""SaathiShikshak — FastAPI application entry point."""
import importlib
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 SaathiShikshak backend starting up...")
    await init_db()
    print("✅ Database tables verified/created")
    try:
        from app.rag.retrieval import get_hybrid_search
        get_hybrid_search()  # Pre-warms ChromaDB + embedding model
        print("✅ RAG retrieval module loaded")
    except Exception as e:
        print(f"⏳ RAG retrieval not ready yet (builds in Sprint Day 2): {e}")
    yield
    print("🛑 SaathiShikshak shutting down cleanly.")


app = FastAPI(
    title="SaathiShikshak API",
    description="AI teaching companion for India's government school teachers",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"

# ── Defensive router registration ──────────────────────────────────────────
# Each endpoint module is built on a different Sprint day (auth + query →
# Day 3, session + feedback + scenarios → Day 4). Until a module actually
# defines `router`, importing it must NOT crash the whole server — it should
# be skipped with a clear console message, and picked up automatically the
# moment that day's real code is pasted in (no changes needed here later).
_ROUTER_MODULES = [
    ("app.api.v1.auth",      "auth"),
    ("app.api.v1.query",     "query"),
    ("app.api.v1.session",   "session"),
    ("app.api.v1.feedback",  "feedback"),
    ("app.api.v1.scenarios", "scenarios"),
]

_loaded: list[str] = []
_deferred: list[str] = []

for module_path, tag in _ROUTER_MODULES:
    try:
        module = importlib.import_module(module_path)
        router = module.router
        app.include_router(router, prefix=API_PREFIX, tags=[tag])
        _loaded.append(tag)
    except (ImportError, AttributeError):
        _deferred.append(tag)

print(f"✅ Routers loaded: {', '.join(_loaded) if _loaded else '(none yet)'}")
if _deferred:
    print(f"⏳ Routers deferred (built in a later Sprint day): {', '.join(_deferred)}")


@app.get("/api/v1/health")
async def health():
    return {
        "status": "ok",
        "version": "1.0.0",
        "service": "saathi-shikshak-api",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }