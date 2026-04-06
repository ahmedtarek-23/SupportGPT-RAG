#!/bin/bash
# Installation Instructions for SupportGPT-RAG Full Stack

## Docker Installation (Required for Full Stack)

### Windows:
1. Download Docker Desktop: https://www.docker.com/products/docker-desktop
2. Run the installer and follow setup wizard
3. Restart your computer after installation
4. Verify installation:
   ```powershell
   docker --version
   docker-compose --version
   ```

### macOS:
1. Download Docker Desktop: https://www.docker.com/products/docker-desktop
2. Or use Homebrew: `brew install docker`
3. Start Docker from Applications
4. Verify: `docker --version`

### Linux (Ubuntu/Debian):
```bash
sudo apt-get update
sudo apt-get install docker.io docker-compose
sudo usermod -aG docker $USER
```

## Running Full Stack After Docker Installation

```bash
# 1. Navigate to project directory
cd support agent/rag-support-agent

# 2. Create .env file from template
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# 3. Build Docker images
docker-compose build

# 4. Start all services
docker-compose up -d

# 5. Verify services are running
docker-compose ps

# Expected output:
# postgres      - Running on 5432
# redis         - Running on 6379
# api           - Running on 8000
# celery_worker - Running (no port)

# 6. Check logs
docker-compose logs -f api
docker-compose logs -f celery_worker

# 7. Test health endpoint
curl http://localhost:8000/api/health

# 8. To stop stack
docker-compose down
```

## Alternative: Local Development (Without Docker)

If Docker installation is problematic, test locally:

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Create .env file
cp .env.example .env
# Edit .env with:
# - OPENAI_API_KEY=your-key
# - EMBEDDING_STORE_TYPE=json (for dev, no PostgreSQL needed)
# - REDIS_URL=redis://localhost:6379/0 (optional, caching disabled if unavailable)

# 3. Start API (no database required)
uvicorn app.main:app --reload

# 4. API available at http://localhost:8000
# 5. Swagger docs at http://localhost:8000/docs

# 6. Test endpoints:
curl http://localhost:8000/api/health
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "How do I reset my password?"}'
```

## Test Scenarios

### Scenario 1: Basic Chat (JSON Storage - No DB)
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the refund policy?",
    "top_k": 3
  }'
```

### Scenario 2: Multi-turn Conversation With Session
```bash
# 1. Create session
SESSION_ID=$(curl -X POST http://localhost:8000/api/chat/session/create \
  -H "Content-Type: application/json" | jq -r '.session_id')

# 2. First question
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"How do I cancel my subscription?\",
    \"session_id\": \"$SESSION_ID\"
  }"

# 3. Follow-up question (uses session context)
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"What about my remaining balance?\",
    \"session_id\": \"$SESSION_ID\"
  }"

# 4. View session history
curl http://localhost:8000/api/chat/session/$SESSION_ID
```

### Scenario 3: Document Upload (Full Stack Only)
```bash
# 1. Upload document
TASK_ID=$(curl -X POST http://localhost:8000/api/documents/upload \
  -F "file=@document.pdf" \
  -F "source_name=docs/manual" | jq -r '.task_id')

# 2. Poll ingestion status
curl http://localhost:8000/api/documents/upload/$TASK_ID

# 3. Once complete, query ingested document
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What does section 3 say?",
    "top_k": 5
  }'
```

## Troubleshooting

### "OPENAI_API_KEY not found"
```bash
# Make sure .env has:
OPENAI_API_KEY=sk-your-actual-key-here
# (no quotes, no extra whitespace)
```

### Redis connection refused (when not using Docker)
```bash
# Either:
# 1. Install Redis locally (optional for dev):
#    Windows: https://github.com/microsoftarchive/redis/releases
#    macOS: brew install redis
#    Linux: sudo apt-get install redis-server
# 
# 2. Or disable caching in .env:
#    ENABLE_CACHING=false
#    ENABLE_SESSION_MEMORY=false
```

### "psycopg2 not found / PostgreSQL connection refused"
```bash
# Use JSON storage in .env (no database needed):
EMBEDDING_STORE_TYPE=json
DATABASE_URL=  # Leave empty
ENABLE_HYBRID_SEARCH=false  # Optional for dev
```

### Port already in use
```bash
# Find and kill process using port
# On Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Change port in command:
uvicorn app.main:app --reload --port 8001
```

## Performance Expectations

### JSON Storage Mode (Local Dev):
- Startup: ~2-3 seconds
- First query: ~3-5 seconds (embedding + retrieval)
- Cached query: ~100ms
- Multi-turn conversation: ~3-5s per turn

### Full Stack (PostgreSQL + Redis):
- Startup: ~10-15 seconds (services starting)
- First query: ~2-3 seconds (optimized retrieval)
- Cached query: <100ms
- Document upload (10KB): ~20-30 seconds total
- 100 concurrent queries: ~200-300ms latency

## Next Steps After Testing

1. **Phase 6** - Advanced Conversation Features (context summarization, clarifying questions)
2. **Phase 7** - Observability (metrics collection, distributed tracing)
3. **Production Deployment** - Kubernetes, autoscaling, monitoring

## Support

For issues, check:
- Logs: `docker-compose logs -f <service>`
- README.md - Troubleshooting section
- Configuration: Verify .env matches your setup
