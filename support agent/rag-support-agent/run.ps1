$ErrorActionPreference = "Stop"

Write-Host "Checking if Docker is running..."
try {
    docker info > $null 2>&1
} catch {
    Write-Host "Error: Docker Desktop is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

Write-Host "Starting Postgres and Redis via Docker Compose..." -ForegroundColor Green
docker-compose up -d postgres redis

Write-Host "Starting Celery worker in the background..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; python -m celery -A app.services.background_task_service.celery_app worker --loglevel=info"

Write-Host "Starting Frontend in the background..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm run dev"

Write-Host "Starting FastAPI Backend..." -ForegroundColor Green
python -m uvicorn app.main:app --reload
