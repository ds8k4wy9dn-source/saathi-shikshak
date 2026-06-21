# SaathiShikshak (साथी शिक्षक)
## Core Solution Sections — MVP, Architecture, Knowledge Base & Tech Stack

---

LIVE App MVP = "https://saathi-shikshak-frontend.vercel.app/"

---

# 1. MVP Feature Set

| Feature | Description |
|---|---|
| **Conversational AI Core** | Hindi + English LLM-powered chat with structured EMPOWER output format |
| **RAG Knowledge Base** | NEP 2020 + NIPUN Bharat + NCERT Grades 3–8 (Hindi, Math, EVS/Science) |
| **Context Collection Flow** | 2-step structured intake: grade/subject → classroom challenge |
| **Structured Output Renderer** | 5-block response: Immediate Steps / Activity / Inclusion / Reflection / Reference |
| **Voice Input (Hindi)** | Web Speech API → Hindi/English text → query pipeline |
| **Session Memory** | Last 5 interactions stored per teacher, surfaced at session start |
| **Offline Cache** | 100 pre-computed common scenarios via Service Worker + IndexedDB |
| **Phone OTP Auth** | Firebase OTP — single credential, no passwords |
| **PWA Install Prompt** | Add-to-homescreen for Android (no Play Store required) |
| **Simple Feedback** | 1-tap "Did this help?" after each response |

---

# 2. System Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                       TEACHER (PWA / WhatsApp)                      │
│                   Voice/Text Input (Hindi/English)                  │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                        ┌──────────▼──────────┐
                        │   LANGUAGE LAYER    │
                        │  (Detection +       │
                        │   IndicTrans2)      │
                        └──────────┬──────────┘
                                   │
               ┌───────────────────┼───────────────────┐
               │                   │                   │
       ┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐
       │ OFFLINE CACHE │   │      RAG      │   │ SESSION STORE │
       │  (IndexedDB)  │   │   PIPELINE    │   │ (PostgreSQL)  │
       │ 100 scenarios │   │ (LlamaIndex + │   │ Last 5 turns  │
       └───────┬───────┘   │    Chroma)    │   └───────┬───────┘
  (if offline) │           └───────┬───────┘           │
               │                   │                   │
               └───────────────────┼───────────────────┘
                                   │
                        ┌──────────▼──────────┐
                        │   CONTEXT BUILDER   │
                        │  Teacher profile    │
                        │  + Retrieved docs   │
                        │  + Session history  │
                        │  + System prompt    │
                        └──────────┬──────────┘
                                   │
                        ┌──────────▼──────────┐
                        │    LLM INFERENCE    │
                        │  Claude Sonnet 4.6  │
                        │   (Anthropic API)   │
                        └──────────┬──────────┘
                                   │
                        ┌──────────▼──────────┐
                        │   RESPONSE PARSER   │
                        │  JSON → Structured  │
                        │  5-block renderer   │
                        └──────────┬──────────┘
                                   │
                        ┌──────────▼──────────┐
                        │    OUTPUT (PWA)     │
                        │  Immediate Steps    │
                        │  Activity           │
                        │  Inclusion Strategy │
                        │  Reflection Prompt  │
                        │  NEP/NIPUN Source   │
                        └─────────────────────┘
```

---

# 3. Knowledge Base

| Document |
|---|
| NEP 2020 Full Text |
| NIPUN Bharat Framework |
| NCERT Pedagogical Guides — Hindi (Gr 1–8) |
| NCERT Pedagogical Guides — Mathematics (Gr 1–8) |
| NCERT Pedagogical Guides — EVS/Science (Gr 3–8) |
| TaRL India Methodology (Teaching at the Right Level) |
| Inclusive Education Guidelines (RPWD Act 2016) |

---

# 4. Complete Tech Stack

## 4.1 Backend Stack

| # | Dependency | Version |
|---|---|---|
| 1 | Python | 3.13.13 |
| 2 | FastAPI | 0.136.3 |
| 3 | Uvicorn (dep of FastAPI) | 0.34.x (latest) |
| 4 | Pydantic (dep of FastAPI) | 2.x (latest v2 patch) |
| 5 | PostgreSQL (DB server) | 17.10 |
| 6 | asyncpg (async PG driver) | 0.30.x (latest) |
| 7 | SQLAlchemy (ORM) | 2.0.x (latest) |
| 8 | ChromaDB | 1.5.9 |
| 9 | llama-index-core | 0.14.22 |
| 10 | llama-index-vector-stores-chroma | latest compatible |
| 11 | llama-index-embeddings-huggingface | latest compatible |
| 12 | llama-index-llms-anthropic | latest compatible |
| 13 | Embeddings Model | `intfloat/multilingual-e5-small` |
| 14 | sentence-transformers (embedding runner) | 3.x (latest) |
| 15 | anthropic (SDK) | 0.105.2 |
| 16 | redis (Python client) | 5.2.x or 6.x (latest stable) |
| 17 | firebase-admin | 6.x (latest) |
| 18 | PyMuPDF (PDF parsing) | 1.25.x (latest) |
| 19 | rank-bm25 (BM25 sparse retrieval) | 0.2.x (latest) |
| 20 | python-dotenv | 1.0.x (latest) |

## 4.2 Frontend Stack

| # | Dependency | Version |
|---|---|---|
| 1 | React | 19.2.6 |
| 2 | React DOM | 19.2.6 |
| 3 | Vite | 8.0.16 |
| 4 | @vitejs/plugin-react | 4.x (latest) |
| 5 | vite-plugin-pwa | 1.3.0 |
| 6 | workbox-sw | 7.4.1 |
| 7 | TypeScript | 5.x (latest stable) |
| 8 | tailwindcss | 4.3.0 |
| 9 | @tailwindcss/vite | 4.3.0 |
| 10 | Zustand | 5.0.14 |
| 11 | Dexie.js | 4.4.2 |
| 12 | react-i18next | 17.0.8 |
| 13 | i18next | 26.3.1 |
| 14 | Axios | 1.17.0 |
| 15 | @tanstack/react-query | 5.101.0 |
| 16 | @tanstack/react-query-devtools | 5.x (latest, devDep) |
| 17 | WebSpeech API | Browser-native |

## 4.3 API Endpoints (FastAPI)

```python
# Core endpoints — MVP

POST   /api/v1/query          # Main teacher query → RAG + LLM → structured response
GET    /api/v1/session/{uid}  # Retrieve teacher's last 5 session records
POST   /api/v1/feedback       # Store teacher's 1-tap feedback (thumbs up/down)
POST   /api/v1/auth/verify    # Verify Firebase OTP token → create/retrieve user
GET    /api/v1/scenarios      # Batch download of offline cache scenarios
GET    /api/v1/health         # Service health check
```

---
