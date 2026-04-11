# SupportGPT-RAG — AI University Productivity Platform

## Tech Stack
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL + pgvector + Redis + Celery
- **Frontend**: React 18 + Vite + TypeScript + Tailwind + Motion.js + shadcn/ui
- **AI**: Ollama (local LLM — llama3 / mistral) + sentence-transformers (local embeddings)
- **Infrastructure**: Docker Compose

## Key Architecture Rules
- Clean service-layer separation (routes → services → models)
- All routes use `DEFAULT_USER_ID = UUID("00000000-0000-0000-0000-000000000001")` (MVP, no auth)
- UI theme: dark glassmorphism, `#03040F` background, gradients `#0066FF → #7B2FBE → #00D4FF`
- **No new pages** — use modals, slide-out panels, in-dashboard widgets
- Fonts: Syne (headings), Space Grotesk (body)

## AI Backend
- **LLM**: Ollama via OpenAI-compatible endpoint `/v1`
  - Client: `openai.OpenAI(api_key="ollama", base_url="http://localhost:11434/v1")`
  - Model: `llama3` (or `mistral`)
  - Pull model: `ollama pull llama3`
- **Embeddings**: sentence-transformers `all-MiniLM-L6-v2` (384-dim, NO API key needed)
- **pgvector dimension**: `Vector(384)` — changing this requires DROP TABLE embedding_chunks

## Project Root
`support agent/rag-support-agent/`

## Backend Entry: `app/main.py`
Registered routers: chat, documents, feedback, health, deadlines, notifications, planner, flashcards, **teachers**

## New in Phase 3 (current)
- Ollama replaces OpenAI for all LLM calls
- sentence-transformers replace OpenAI embeddings
- Teacher Hub: full CRUD + office hours + course assignment
  - Model: `app/db/models.py::Teacher`
  - Service: `app/services/teacher_service.py`
  - Routes: `app/api/routes/teachers.py`
  - Frontend: `TeacherHubPanel.tsx` (slide-out, not a page)
- Pomodoro Timer: `PomodoroTimer.tsx` (inline dashboard widget)
- Docker: Ollama service added to `docker-compose.yml`

## Coding Standards
- Write production-ready code with error handling
- Backend: typed Pydantic schemas for all API I/O
- Frontend: inline styles matching the theme (no Tailwind in dashboard components)
- Keep it modular — one responsibility per service
