"""GET /api/v1/scenarios — Serve pre-computed offline scenarios for IndexedDB caching."""
import json
from pathlib import Path

from fastapi import APIRouter

router = APIRouter()

# Path resolves to saathi-shikshak/offline-scenarios/
# __file__ = backend/app/api/v1/scenarios.py → 5 parents up = project root
SCENARIOS_DIR = Path(__file__).parents[4] / "offline-scenarios"


@router.get("/scenarios")
async def get_scenarios() -> dict:
    """
    Return all pre-computed offline scenario JSON files.
    The frontend caches these in IndexedDB on first load for airplane-mode support.
    """
    scenarios = []
    if SCENARIOS_DIR.exists():
        for f in sorted(SCENARIOS_DIR.glob("*.json")):
            try:
                scenarios.append(json.loads(f.read_text(encoding="utf-8")))
            except Exception:
                continue  # Skip any malformed files silently

    return {"scenarios": scenarios, "count": len(scenarios)}