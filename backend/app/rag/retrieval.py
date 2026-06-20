"""
Hybrid search: dense (ChromaDB cosine) + sparse (BM25) + RRF fusion.
Supports metadata filtering by grade_band and subject.
"""
import pickle
from functools import lru_cache
from pathlib import Path

import chromadb
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer

from app.core.config import settings

DATA_DIR = Path(__file__).parent.parent.parent / "data"
BM25_PATH = DATA_DIR / "bm25_index.pkl"

# Grade band mapping from numeric grade to label
GRADE_TO_BAND = {
    "1": "Foundational (1-2)", "2": "Foundational (1-2)",
    "3": "Preparatory (3-5)",  "4": "Preparatory (3-5)",  "5": "Preparatory (3-5)",
    "6": "Middle (6-8)",       "7": "Middle (6-8)",        "8": "Middle (6-8)",
}


class HybridSearch:
    def __init__(self):
        # ChromaDB client + collection
        self.client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
        self.collection = self.client.get_or_create_collection(
            name="saathi_knowledge_base",
            metadata={"hnsw:space": "cosine"},
        )

        # Embedding model (already cached in ~/.cache/huggingface/)
        self.model = SentenceTransformer(settings.embedding_model)

        # BM25 index (built during ingestion)
        self._bm25_index: BM25Okapi | None = None
        self._bm25_doc_ids: list[str] = []
        self._bm25_doc_map: dict[str, dict] = {}
        self._load_bm25()

    def _load_bm25(self):
        if not BM25_PATH.exists():
            print("⚠️  BM25 index not found. Run ingest.py first. Using dense-only search.")
            return
        with open(BM25_PATH, "rb") as f:
            data = pickle.load(f)
        self._bm25_index = data["index"]
        self._bm25_doc_ids = data["doc_ids"]
        self._bm25_doc_map = data["doc_map"]
        print(f"✅ BM25 index loaded ({len(self._bm25_doc_ids)} docs)")

    def _tokenize(self, text: str) -> list[str]:
        return text.lower().split()

    def _build_where_filter(self, grade: str | None, subject: str | None) -> dict | None:
        """Build ChromaDB v1.x metadata filter."""
        conditions = []
        if grade:
            band = GRADE_TO_BAND.get(grade)
            if band:
                conditions.append({"grade_band": {"$in": [band, "all"]}})
        if subject and subject != "general":
            conditions.append({"subject": {"$in": [subject, "general"]}})

        if not conditions:
            return None
        if len(conditions) == 1:
            return conditions[0]
        return {"$and": conditions}

    def _dense_search(
        self, query: str, grade: str | None, subject: str | None, n_results: int = 10
    ) -> list[dict]:
        """Dense retrieval using multilingual-e5-small embeddings."""
        n = min(n_results, self.collection.count())
        if n <= 0:
            return []

        query_embedding = self.model.encode(
            f"query: {query}", normalize_embeddings=True
        ).tolist()
        where = self._build_where_filter(grade, subject)

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n,
            where=where,
            # ChromaDB v1.x does NOT accept "ids" as an `include` value — ids
            # are always returned automatically. Passing "ids" here raises a
            # ValueError at runtime: "Expected include item to be one of
            # ['distances','documents','metadatas','embeddings','uris']".
            include=["documents", "metadatas", "distances"],
        )

        ids = results["ids"]
        documents = results["documents"]
        metadatas = results["metadatas"]
        distances = results["distances"]

        # ChromaDB's QueryResult types these fields as Optional even when
        # explicitly requested via `include` — guard defensively so both
        # Pylance and runtime behavior stay safe if Chroma ever omits them.
        if not ids or not ids[0] or documents is None or metadatas is None or distances is None:
            return []

        output = []
        for i, doc_id in enumerate(ids[0]):
            output.append({
                "id": doc_id,
                "document": documents[0][i],
                "metadata": metadatas[0][i],
                "distance": distances[0][i],
            })
        return output

    def _sparse_search(self, query: str, n_results: int = 10) -> list[dict]:
        """Sparse BM25 retrieval."""
        if self._bm25_index is None:
            return []

        tokenized_query = self._tokenize(query)
        scores = self._bm25_index.get_scores(tokenized_query)

        # Get top-n indices by score
        top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:n_results]

        output = []
        for idx in top_indices:
            if scores[idx] <= 0:
                continue
            doc_id = self._bm25_doc_ids[idx]
            doc_data = self._bm25_doc_map.get(doc_id, {})
            output.append({
                "id": doc_id,
                "document": doc_data.get("document", ""),
                "metadata": doc_data.get("metadata", {}),
                "bm25_score": float(scores[idx]),
            })
        return output

    def _reciprocal_rank_fusion(
        self, dense: list[dict], sparse: list[dict], alpha: float = 0.6, k: int = 60
    ) -> list[dict]:
        """Weighted RRF: alpha controls dense vs. sparse balance."""
        scores: dict[str, dict] = {}

        for rank, result in enumerate(dense):
            doc_id = result["id"]
            if doc_id not in scores:
                scores[doc_id] = {"data": result, "score": 0.0}
            scores[doc_id]["score"] += alpha / (k + rank + 1)

        for rank, result in enumerate(sparse):
            doc_id = result["id"]
            if doc_id not in scores:
                scores[doc_id] = {"data": result, "score": 0.0}
            scores[doc_id]["score"] += (1 - alpha) / (k + rank + 1)

        sorted_items = sorted(scores.values(), key=lambda x: x["score"], reverse=True)
        return [item["data"] for item in sorted_items]

    def search(
        self,
        query: str,
        grade: str | None = None,
        subject: str | None = None,
        top_k: int = 5,
        alpha: float = 0.6,
    ) -> list[dict]:
        """
        Main search method. Returns top_k chunks as dicts with:
        {id, document, metadata: {document_display, source_url, ...}}
        """
        if self.collection.count() == 0:
            return []

        dense_results = self._dense_search(query, grade, subject, n_results=10)
        sparse_results = self._sparse_search(query, n_results=10)

        if not dense_results and not sparse_results:
            return []
        if not sparse_results:
            return dense_results[:top_k]
        if not dense_results:
            return sparse_results[:top_k]

        merged = self._reciprocal_rank_fusion(dense_results, sparse_results, alpha)
        return merged[:top_k]


# Module-level singleton — loaded once at startup
@lru_cache(maxsize=1)
def get_hybrid_search() -> HybridSearch:
    return HybridSearch()