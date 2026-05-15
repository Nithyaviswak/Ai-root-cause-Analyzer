# 🧠 AI Root Cause Analyzer

**Production-grade RAG-based AI system that simulates an experienced SRE engineer for root cause analysis.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000?logo=next.js)](https://nextjs.org/)
[![Gemini](https://img.shields.io/badge/Gemini_2.0-Flash-4285F4?logo=google)](https://ai.google.dev/)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Frontend                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │  Chat UI │ │ Log Paste│ │ Analysis │ │Dark/Light │  │
│  │ (Claude) │ │ + Upload │ │  Cards   │ │  Toggle   │  │
│  └────┬─────┘ └────┬─────┘ └──────────┘ └───────────┘  │
│       │             │            ▲                        │
│       └─────────┬───┘            │  SSE Streaming         │
└─────────────────┼────────────────┼───────────────────────┘
                  │ HTTP/SSE       │
┌─────────────────┼────────────────┼───────────────────────┐
│                 ▼  FastAPI Backend                        │
│  ┌──────────────────────────────────────────────────┐    │
│  │            SRE Simulation Engine                   │    │
│  │  Step 1: Identify → Step 2: Trace → Step 3: Corr │    │
│  │  → Step 4: Historical → Step 5: Fix (Gemini)      │    │
│  └────┬──────────┬──────────┬──────────┬────────────┘    │
│       │          │          │          │                   │
│  ┌────▼───┐ ┌───▼────┐ ┌──▼──┐  ┌───▼─────────┐        │
│  │Ingest  │ │ T-RAG  │ │ RCA │  │ Gemini LLM  │        │
│  │Service │ │ Engine │ │Eng. │  │ (Streaming)  │        │
│  └────┬───┘ └───┬────┘ └─────┘  └─────────────┘        │
│       │         │                                        │
│  ┌────▼─────────▼────┐    ┌──────────────┐              │
│  │  sentence-transformers │ │ RAGFlow API  │              │
│  │  (Embeddings)      │    │ (Optional)   │              │
│  └────────┬───────────┘    └──────────────┘              │
│           │                                              │
│  ┌────────▼───────────┐    ┌──────────────┐              │
│  │     ChromaDB       │    │   SQLite     │              │
│  │  (Vector Store)    │    │  (History)   │              │
│  └────────────────────┘    └──────────────┘              │
└──────────────────────────────────────────────────────────┘
```

## 🔌 Plugin Integrations

| Plugin | Purpose | Link |
|--------|---------|------|
| **sentence-transformers** | Log/trace/metric embeddings | [GitHub](https://github.com/huggingface/sentence-transformers) |
| **RAGFlow** | Advanced RAG orchestration | [GitHub](https://github.com/infiniflow/ragflow) |
| **finetune-embedding** | Embedding fine-tuning pipeline | [GitHub](https://github.com/run-llama/finetune-embedding) |
| **UI UX Pro Max** | Design system intelligence | [GitHub](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) |

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.11+** and **Node.js 20+**
- **Google Gemini API key** → [Get one here](https://aistudio.google.com/apikey)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env and set your GOOGLE_API_KEY

# Start server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set API URL (optional, defaults to localhost:8000)
# create .env.local with: NEXT_PUBLIC_API_URL=http://localhost:8000

# Start dev server
npm run dev
```

### 3. Open the App

Visit **http://localhost:3000** — paste logs or click "Try with sample logs" 🚀

---

## 🐳 Docker Deployment

```bash
# Configure
copy .env.example .env
# Edit .env with your GOOGLE_API_KEY

# Build and run
docker compose up --build -d

# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# Health:   http://localhost:8000/api/health
```

---

## 📊 Output Format

```json
{
  "detected_issue": "Payment gateway connection timeout causing cascading failures",
  "severity": "critical",
  "affected_services": ["payment-service", "order-service", "api-gateway"],
  "root_cause": "AWS NAT Gateway degradation in us-east-1a causing external egress packet loss",
  "evidence": [
    "78% packet loss on NAT gateway nat-gw-prod-01",
    "Payment service circuit breaker OPEN after 3 failed retries"
  ],
  "confidence_score": "92%",
  "suggested_fix": "Failover to NAT gateway in us-east-1b",
  "preventive_measures": "Implement multi-AZ NAT gateway redundancy"
}
```

---

## 🔧 Fine-Tuning Embeddings

```bash
cd finetune

# Generate synthetic training data
python generate_dataset.py

# Fine-tune the embedding model
python finetune_embeddings.py

# Update backend .env with the fine-tuned model path
# FINETUNED_MODEL_PATH=./finetune/output/finetuned-model
```

---

## 📂 Project Structure

```
Ai-root-cause-analyzer/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Environment config
│   │   ├── routes/              # API endpoints
│   │   │   ├── analyze.py       # POST /api/analyze
│   │   │   ├── upload.py        # POST /api/upload
│   │   │   └── history.py       # GET /api/history
│   │   ├── services/            # Business logic
│   │   │   ├── ingestion.py     # Log/metric parsing
│   │   │   ├── embedding.py     # sentence-transformers
│   │   │   ├── vector_store.py  # ChromaDB
│   │   │   ├── trag.py          # Hybrid retrieval
│   │   │   ├── ragflow_client.py# RAGFlow API client
│   │   │   ├── rca_engine.py    # Root cause analysis
│   │   │   ├── gemini_llm.py    # Gemini streaming
│   │   │   └── sre_simulator.py # 5-step SRE workflow
│   │   └── models/              # Schemas & DB
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js app router
│   │   ├── components/          # React components
│   │   ├── lib/api.ts           # API client + SSE
│   │   └── types/index.ts       # TypeScript types
│   └── Dockerfile
├── data/sample/                 # Sample datasets
├── finetune/                    # Embedding fine-tuning
├── docker-compose.yml
└── README.md
```

---

## 🧪 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analyze` | Run root cause analysis |
| `POST` | `/api/analyze/stream` | Stream analysis (SSE) |
| `POST` | `/api/chat` | Chat-style analysis |
| `POST` | `/api/upload` | Upload log files |
| `GET` | `/api/history` | List past analyses |
| `GET` | `/api/history/{id}` | Get specific analysis |
| `GET` | `/api/health` | Health check |

---

## 📈 Evaluation Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| MTTR Reduction | 50%+ | Faster root cause identification |
| Retrieval Accuracy | 85%+ | Relevant context from vector DB |
| Root Cause Accuracy | 80%+ | Correct root cause identification |
| Response Latency | <10s | End-to-end analysis time |

---

## License

MIT
