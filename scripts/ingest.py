#!/usr/bin/env python3
"""
SaathiShikshak PDF Ingestion Pipeline
Reads PDFs from knowledge-base/raw/, chunks them, embeds with multilingual-e5-small,
and stores in ChromaDB v1.x with metadata.

Usage (from backend/ directory):
    uv run python ../scripts/ingest.py
    uv run python ../scripts/ingest.py --reset   # Clear collection and re-ingest
"""
import argparse
import hashlib
import pickle
import sys
from pathlib import Path

import chromadb
import fitz  # PyMuPDF
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

# ── Configuration ─────────────────────────────────────────────────────────────
RAW_DIR = Path(__file__).parent.parent / "knowledge-base" / "raw"
CHROMA_DIR = Path(__file__).parent.parent / "backend" / "data" / "chroma"
BM25_PATH = Path(__file__).parent.parent / "backend" / "data" / "bm25_index.pkl"

CHUNK_SIZE = 400    # tokens (approx. by whitespace)
CHUNK_OVERLAP = 40  # token overlap between chunks
EMBEDDING_MODEL = "intfloat/multilingual-e5-small"
COLLECTION_NAME = "saathi_knowledge_base"

DOCUMENT_METADATA = {
    "NEP_2020.pdf": {
        "document_name": "NEP_2020",
        "document_display": "NEP 2020 — राष्ट्रीय शिक्षा नीति 2020",
        "language": "en",
        "subject": "general",
        "grade_band": "all",
    },
    "NIPUN_Bharat.pdf": {
        "document_name": "NIPUN_Bharat",
        "document_display": "NIPUN Bharat Framework",
        "language": "en",
        "subject": "general",
        "grade_band": "Foundational (1-2)",
    },
    "NCERT_Primary_Guide.pdf": {
        "document_name": "NCERT_Primary_Guide",
        "document_display": "NCERT Primary Teacher Manual",
        "language": "en",
        "subject": "general",
        "grade_band": "Foundational (1-2)",
    },
    "NCERT_Class3_English.pdf": {
        "document_name": "NCERT_Class3_English",
        "document_display": "NCERT Class-3 English",
        "language": "en",
        "subject": "English",
        "grade_band": "Preparatory (3-5)",
    },
    "NCERT_Class3_EVS.pdf": {
        "document_name": "NCERT_Class3_EVS",
        "document_display": "NCERT Class-3 Environmental Science",
        "language": "en",
        "subject": "EVS",
        "grade_band": "Preparatory (3-5)",
    },
    "NCERT_Class3_Hindi.pdf": {
        "document_name": "NCERT_Class3_Hindi",
        "document_display": "NCERT Class-3 Hindi",
        "language": "hi",
        "subject": "Hindi",
        "grade_band": "Preparatory (3-5)",
    },
    "NCERT_Class3_Mathematics.pdf": {
        "document_name": "NCERT_Class3_Mathematics",
        "document_display": "NCERT Class-3 Mathematics",
        "language": "en",
        "subject": "Mathematics",
        "grade_band": "Preparatory (3-5)",
    },
    "NCERT_Class4_English.pdf": {
        "document_name": "NCERT_Class4_English",
        "document_display": "NCERT Class-4 English",
        "language": "en",
        "subject": "English",
        "grade_band": "Preparatory (3-5)",
    },
    "NCERT_Class4_EVS.pdf": {
        "document_name": "NCERT_Class4_EVS",
        "document_display": "NCERT Class-4 Environmental Science",
        "language": "en",
        "subject": "EVS",
        "grade_band": "Preparatory (3-5)",
    },
    "NCERT_Class4_Hindi.pdf": {
        "document_name": "NCERT_Class4_Hindi",
        "document_display": "NCERT Class-4 Hindi",
        "language": "hi",
        "subject": "Hindi",
        "grade_band": "Preparatory (3-5)",
    },
    "NCERT_Class4_Mathematics.pdf": {
        "document_name": "NCERT_Class4_Mathematics",
        "document_display": "NCERT Class-4 Mathematics",
        "language": "en",
        "subject": "Mathematics",
        "grade_band": "Preparatory (3-5)",
    },
    "NCERT_Class5_English.pdf": {
        "document_name": "NCERT_Class5_English",
        "document_display": "NCERT Class-5 English",
        "language": "en",
        "subject": "English",
        "grade_band": "Preparatory (3-5)",
    },
    "NCERT_Class5_EVS.pdf": {
        "document_name": "NCERT_Class5_EVS",
        "document_display": "NCERT Class-5 Environmental Science",
        "language": "en",
        "subject": "EVS",
        "grade_band": "Preparatory (3-5)",
    },
    "NCERT_Class5_Hindi.pdf": {
        "document_name": "NCERT_Class5_Hindi",
        "document_display": "NCERT Class-5 Hindi",
        "language": "hi",
        "subject": "Hindi",
        "grade_band": "Preparatory (3-5)",
    },
    "NCERT_Class5_Mathematics.pdf": {
        "document_name": "NCERT_Class5_Mathematics",
        "document_display": "NCERT Class-5 Mathematics",
        "language": "en",
        "subject": "Mathematics",
        "grade_band": "Preparatory (3-5)",
    },
    "NCERT_Class6_English.pdf": {
        "document_name": "NCERT_Class6_English",
        "document_display": "NCERT Class-6 English",
        "language": "en",
        "subject": "English",
        "grade_band": "Middle (6-8)",
    },
    "NCERT_Class6_Hindi.pdf": {
        "document_name": "NCERT_Class6_Hindi",
        "document_display": "NCERT Class-6 Hindi",
        "language": "hi",
        "subject": "Hindi",
        "grade_band": "Middle (6-8)",
    },
    "NCERT_Class6_Mathematics.pdf": {
        "document_name": "NCERT_Class6_Mathematics",
        "document_display": "NCERT Class-6 Mathematics",
        "language": "en",
        "subject": "Mathematics",
        "grade_band": "Middle (6-8)",
    },
    "NCERT_Class6_Science.pdf": {
        "document_name": "NCERT_Class6_Science",
        "document_display": "NCERT Class-6 Science",
        "language": "en",
        "subject": "Science",
        "grade_band": "Middle (6-8)",
    },
    "NCERT_Class6_SocialStudies.pdf": {
        "document_name": "NCERT_Class6_SocialStudies",
        "document_display": "NCERT Class-6 Social Studies",
        "language": "en",
        "subject": "Social Studies",
        "grade_band": "Middle (6-8)",
    },
    "NCERT_Class7_English.pdf": {
        "document_name": "NCERT_Class7_English",
        "document_display": "NCERT Class-7 English",
        "language": "en",
        "subject": "English",
        "grade_band": "Middle (6-8)",
    },
    "NCERT_Class7_Hindi.pdf": {
        "document_name": "NCERT_Class7_Hindi",
        "document_display": "NCERT Class-7 Hindi",
        "language": "hi",
        "subject": "Hindi",
        "grade_band": "Middle (6-8)",
    },
    "NCERT_Class7_Mathematics.pdf": {
        "document_name": "NCERT_Class7_Mathematics",
        "document_display": "NCERT Class-7 Mathematics",
        "language": "en",
        "subject": "Mathematics",
        "grade_band": "Middle (6-8)",
    },
    "NCERT_Class7_Science.pdf": {
        "document_name": "NCERT_Class7_Science",
        "document_display": "NCERT Class-7 Science",
        "language": "en",
        "subject": "Science",
        "grade_band": "Middle (6-8)",
    },
    "NCERT_Class7_SocialStudies.pdf": {
        "document_name": "NCERT_Class7_SocialStudies",
        "document_display": "NCERT Class-7 Social Studies",
        "language": "en",
        "subject": "Social Studies",
        "grade_band": "Middle (6-8)",
    },
    "NCERT_Class8_English.pdf": {
        "document_name": "NCERT_Class8_English",
        "document_display": "NCERT Class-8 English",
        "language": "en",
        "subject": "English",
        "grade_band": "Middle (6-8)",
    },
    "NCERT_Class8_Hindi.pdf": {
        "document_name": "NCERT_Class8_Hindi",
        "document_display": "NCERT Class-8 Hindi",
        "language": "hi",
        "subject": "Hindi",
        "grade_band": "Middle (6-8)",
    },
    "NCERT_Class8_Mathematics.pdf": {
        "document_name": "NCERT_Class8_Mathematics",
        "document_display": "NCERT Class-8 Mathematics",
        "language": "en",
        "subject": "Mathematics",
        "grade_band": "Middle (6-8)",
    },
    "NCERT_Class8_Science.pdf": {
        "document_name": "NCERT_Class8_Science",
        "document_display": "NCERT Class-8 Science",
        "language": "en",
        "subject": "Science",
        "grade_band": "Middle (6-8)",
    },
    "NCERT_Class8_SocialStudies.pdf": {
        "document_name": "NCERT_Class8_SocialStudies",
        "document_display": "NCERT Class-8 Social Studies",
        "language": "en",
        "subject": "Social Studies",
        "grade_band": "Middle (6-8)",
    },
}

# Default metadata for unrecognized PDFs
DEFAULT_METADATA = {
    "document_name": "unknown",
    "document_display": "Reference Document",
    "language": "en",
    "subject": "general",
    "grade_band": "all",
}


def tokenize(text: str) -> list[str]:
    """Simple whitespace tokenizer for BM25. Handles Hindi + English."""
    return text.lower().split()


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Split text into overlapping chunks by approximate token count."""
    words = text.split()
    if len(words) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append(chunk)
        if end == len(words):
            break
        start += chunk_size - overlap
    return chunks


def extract_text_from_pdf(pdf_path: Path) -> list[tuple[int, str]]:
    """Extract (page_number, text) pairs from a PDF using PyMuPDF."""
    pages = []
    try:
        doc = fitz.open(str(pdf_path))
        for page_num in range(len(doc)):
            page = doc[page_num]
            # PyMuPDF's bundled type stubs don't always expose get_text() on
            # Page, even though it's the correct, current, documented API
            # (replacing the older getText()). Confirmed-correct at runtime.
            text = page.get_text("text")  # type: ignore[attr-defined]
            if text.strip():
                pages.append((page_num + 1, text))
        doc.close()
    except Exception as e:
        print(f"  ⚠️  Error reading {pdf_path.name}: {e}")
    return pages


def make_chunk_id(document_name: str, page: int, chunk_idx: int) -> str:
    """Create a deterministic, stable ID for a chunk."""
    raw = f"{document_name}::p{page}::c{chunk_idx}"
    return hashlib.md5(raw.encode()).hexdigest()



def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="Clear collection before ingesting")
    parser.add_argument("--resume", action="store_true", help="Skip already ingested documents and preserve existing BM25 data")
    args = parser.parse_args()

    # ── Setup ──────────────────────────────────────────────────────────────────
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)
    BM25_PATH.parent.mkdir(parents=True, exist_ok=True)

    print("🔌 Connecting to ChromaDB...")
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))

    if args.reset:
        try:
            client.delete_collection(COLLECTION_NAME)
            print(f"🗑️  Deleted existing collection '{COLLECTION_NAME}'")
        except Exception:
            pass

    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )
    print(f"📦 Collection '{COLLECTION_NAME}' has {collection.count()} existing chunks")

    # ── Load embedding model ───────────────────────────────────────────────────
    print(f"🔢 Loading embedding model: {EMBEDDING_MODEL}")
    model = SentenceTransformer(EMBEDDING_MODEL)

    # ── Process each PDF ───────────────────────────────────────────────────────
    pdf_files = sorted(RAW_DIR.glob("*.pdf"))
    if not pdf_files:
        print(f"⚠️  No PDF files found in {RAW_DIR}")
        print("   Download PDFs first (see Setup Guide §2.1)")
        sys.exit(1)

    print(f"\n📄 Found {len(pdf_files)} PDFs to process\n")

    # BM25 data structures
    bm25_corpus: list[list[str]] = []
    bm25_doc_ids: list[str] = []
    bm25_doc_map: dict[str, dict] = {}
    processed_doc_names = set()

    # Hydrate existing index state to protect P0 data when resuming
    if getattr(args, "resume", False) and BM25_PATH.exists():
        print(f"📥 Loading existing BM25 index from {BM25_PATH} to preserve P0 data...")
        with open(BM25_PATH, "rb") as f:
            old_data = pickle.load(f)
            bm25_doc_ids = old_data.get("doc_ids", [])
            bm25_doc_map = old_data.get("doc_map", {})
            
            # Reconstruct the tokenized corpus for the new unified BM25Okapi build
            bm25_corpus = [tokenize(bm25_doc_map[uid]["document"]) for uid in bm25_doc_ids]
            
            # Keep track of what we already have so we can skip them
            for meta in bm25_doc_map.values():
                processed_doc_names.add(meta.get("metadata", {}).get("document_name"))
                
        print(f"📋 Successfully restored {len(bm25_corpus)} existing chunks into memory.")

    total_chunks = 0

    for pdf_path in pdf_files:
        doc_metadata = DOCUMENT_METADATA.get(pdf_path.name, DEFAULT_METADATA.copy())
        if pdf_path.name not in DOCUMENT_METADATA:
            doc_metadata["document_name"] = pdf_path.stem
            doc_metadata["document_display"] = pdf_path.stem.replace("_", " ")

        # ── ADD THIS SKIP LOGIC ──
        if getattr(args, "resume", False) and doc_metadata["document_name"] in processed_doc_names:
            print(f"⏭️ Skipping already ingested document: {pdf_path.name}")
            continue

        print(f"📖 Processing: {pdf_path.name}")
        pages = extract_text_from_pdf(pdf_path)

        if not pages:
            print(f"   ⚠️  No text extracted from {pdf_path.name} — skipping")
            continue

        # Collect all chunks for this document
        doc_ids, doc_texts, doc_metas = [], [], []

        for page_num, page_text in tqdm(pages, desc="   Chunking pages", leave=False):
            chunks = chunk_text(page_text)
            for chunk_idx, chunk in enumerate(chunks):
                chunk_id = make_chunk_id(doc_metadata["document_name"], page_num, chunk_idx)

                doc_ids.append(chunk_id)
                doc_texts.append(chunk)

                meta = {**doc_metadata, "page_number": page_num, "chunk_index": chunk_idx}
                doc_metas.append(meta)

                # BM25 data
                bm25_corpus.append(tokenize(chunk))
                bm25_doc_ids.append(chunk_id)
                bm25_doc_map[chunk_id] = {"document": chunk, "metadata": meta}

        if not doc_ids:
            continue

        # Batch embed (process in batches of 64 to manage memory).
        # "passage: " prefix is applied here — this is the single place it
        # needs to happen, right before encoding.
        batch_size = 64
        all_embeddings = []
        for i in range(0, len(doc_ids), batch_size):
            batch_texts = [f"passage: {t}" for t in doc_texts[i:i+batch_size]]
            embs = model.encode(batch_texts, show_progress_bar=False, normalize_embeddings=True)
            all_embeddings.extend(embs.tolist())

        # Upsert to ChromaDB (idempotent — safe to run multiple times)
        UPSERT_BATCH = 100
        for i in range(0, len(doc_ids), UPSERT_BATCH):
            collection.upsert(
                ids=doc_ids[i:i+UPSERT_BATCH],
                embeddings=all_embeddings[i:i+UPSERT_BATCH],
                documents=doc_texts[i:i+UPSERT_BATCH],
                metadatas=doc_metas[i:i+UPSERT_BATCH],
            )

        total_chunks += len(doc_ids)
        print(f"   ✅ {len(doc_ids)} chunks indexed from {pdf_path.name}")

    # ── Build and save BM25 index ──────────────────────────────────────────────
    print(f"\n🔍 Building BM25 index over {len(bm25_corpus)} chunks...")
    bm25_index = BM25Okapi(bm25_corpus)
    with open(BM25_PATH, "wb") as f:
        pickle.dump({
            "index": bm25_index,
            "doc_ids": bm25_doc_ids,
            "doc_map": bm25_doc_map,
        }, f)
    print(f"💾 BM25 index saved to {BM25_PATH}")

    # ── Final summary ──────────────────────────────────────────────────────────
    print(f"\n{'='*50}")
    print("✅ Ingestion complete!")
    print(f"   Total chunks in ChromaDB: {collection.count()}")
    print(f"   BM25 index covers: {len(bm25_corpus)} chunks")
    print(f"{'='*50}\n")


if __name__ == "__main__":
    main()