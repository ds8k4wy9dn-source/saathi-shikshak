#!/usr/bin/env python3
"""
SaathiShikshak Diagnostic Script
Identifies exactly which component is broken before you run curl.

Usage (from backend/ directory):
    uv run python ../scripts/diagnose.py
"""
import asyncio
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

# Make backend app importable
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))


async def check_postgres() -> bool:
    print("\n─── PostgreSQL ─────────────────────────────────────────────")
    try:
        import asyncpg
        conn = await asyncpg.connect("postgresql://localhost/saathi_shikshak_dev")
        version = await conn.fetchval("SELECT version()")
        await conn.close()
        print(f"✅ Connected: {version[:60]}")
        return True
    except Exception as e:
        print(f"❌ FAILED: {e}")
        print("   Fix: brew services start postgresql@17")
        print("   Fix: createdb saathi_shikshak_dev")
        return False


async def check_redis() -> bool:
    print("\n─── Redis ──────────────────────────────────────────────────")
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url("redis://localhost:6379/0", decode_responses=True)
        result = await r.ping()
        await r.aclose()
        print(f"✅ Connected: PING → {result}")
        return True
    except Exception as e:
        print(f"❌ FAILED: {e}")
        print("   Fix: brew services start redis")
        return False


def check_chromadb() -> bool:
    print("\n─── ChromaDB ───────────────────────────────────────────────")
    try:
        import chromadb
        chroma_path = Path(__file__).parent.parent / "backend" / "data" / "chroma"
        client = chromadb.PersistentClient(path=str(chroma_path))
        try:
            col = client.get_collection("saathi_knowledge_base")
            count = col.count()
            if count == 0:
                print("⚠️  Collection is EMPTY — RAG will return no context")
                print("   Fix: uv run python ../scripts/ingest.py")
                return False
            print(f"✅ Collection: {count} chunks indexed")
            return True
        except Exception:
            print("⚠️  Collection not found — ingest.py has not been run")
            print("   Fix: uv run python ../scripts/ingest.py")
            return False
    except Exception as e:
        print(f"❌ ChromaDB error: {e}")
        return False


def check_embedding_model() -> bool:
    print("\n─── Embedding Model (multilingual-e5-small) ────────────────")
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer("intfloat/multilingual-e5-small")
        dim = model.get_sentence_embedding_dimension()
        print(f"✅ Loaded: dim={dim} (expected 384)")
        return dim == 384
    except Exception as e:
        print(f"❌ FAILED: {e}")
        print("   Fix: uv run python -c \"from sentence_transformers import "
              "SentenceTransformer; SentenceTransformer('intfloat/multilingual-e5-small')\"")
        return False


async def check_anthropic() -> bool:
    print("\n─── Anthropic API ──────────────────────────────────────────")
    try:
        from app.core.config import settings  # type: ignore[import-not-found]  # Pylance can't see this script's runtime sys.path.insert; resolves fine at runtime (confirmed by this check passing).
        key = settings.anthropic_api_key
        if not key or "<" in key:
            print("⚠️  ANTHROPIC_API_KEY not set in backend/.env.development")
            print("   Get key: https://console.anthropic.com/settings/keys")
            return False

        from anthropic import AsyncAnthropic
        client = AsyncAnthropic(api_key=key)
        resp = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=8,
            messages=[{"role": "user", "content": "Reply with only: OK"}],
        )
        text = getattr(resp.content[0], "text", "").strip()
        print(f"✅ API key valid — test response: '{text}'")
        return True
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False


def check_server_and_endpoint() -> bool:
    print("\n─── FastAPI Server + /api/v1/query ─────────────────────────")

    # 1. Health check
    try:
        with urllib.request.urlopen(
            "http://localhost:8000/api/v1/health", timeout=5
        ) as resp:
            data = json.loads(resp.read())
            print(f"✅ Server UP: {data}")
    except urllib.error.URLError as e:
        print(f"❌ Server NOT reachable: {e}")
        print("   Start it: uv run uvicorn app.main:app --reload --port 8000")
        print("   (in a SEPARATE terminal — leave it running while you test)")
        return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

    # 2. Query endpoint
    payload = json.dumps({
        "teacher_id": "00000000-0000-0000-0000-000000000001",
        "query_text": "बच्चे पढ़ नहीं पाते",
        "language": "hi",
        "grade": "3",
        "subject": "hindi",
    }).encode()

    req = urllib.request.Request(
        "http://localhost:8000/api/v1/query",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = json.loads(resp.read())
            steps = data.get("immediate_steps", {}).get("steps", [])
            print("✅ /api/v1/query works!")
            print(f"   Session ID:    {data.get('session_id', 'n/a')}")
            print(f"   Response time: {data.get('response_time_ms')}ms")
            print(f"   From cache:    {data.get('from_cache')}")
            if steps:
                print(f"   First step:    {steps[0][:80]}...")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"❌ /api/v1/query returned HTTP {e.code}")
        print(f"   Body: {body[:300]}")
        return False
    except Exception as e:
        print(f"❌ /api/v1/query failed: {type(e).__name__}: {e}")
        return False


async def main() -> None:
    print("=" * 60)
    print("  SaathiShikshak — Full Component Diagnostic")
    print("=" * 60)

    results: dict[str, bool] = {}
    results["PostgreSQL"]      = await check_postgres()
    results["Redis"]           = await check_redis()
    results["ChromaDB"]        = check_chromadb()
    results["EmbeddingModel"]  = check_embedding_model()
    results["AnthropicAPI"]    = await check_anthropic()
    results["ServerEndpoint"]  = check_server_and_endpoint()

    print("\n" + "=" * 60)
    print("  Summary")
    print("=" * 60)
    for name, ok in results.items():
        icon = "✅" if ok else "❌"
        print(f"  {icon}  {name}")

    failed = [k for k, v in results.items() if not v]
    print()
    if not failed:
        print("🎉 All components healthy — the full curl test should work now.")
    else:
        print("⚠️  Fix the ❌ items above, then re-run: uv run python ../scripts/diagnose.py")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())