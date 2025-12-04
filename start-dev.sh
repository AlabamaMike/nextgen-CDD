#!/bin/bash
# Development Environment Startup Script
# This script starts all required services for local development

set -e

echo "========================================="
echo "Thesis Validator - Development Startup"
echo "========================================="
echo ""

# Change to thesis-validator directory
cd "$(dirname "$0")/thesis-validator"

echo "1. Checking Docker services..."
if ! docker ps &>/dev/null; then
    echo "   ERROR: Docker is not running or you don't have permission."
    echo "   Make sure you're in the 'docker' group: sudo usermod -aG docker $USER"
    exit 1
fi

echo "2. Starting infrastructure (PostgreSQL, Redis, Qdrant)..."
docker compose up -d postgres redis qdrant

echo "3. Waiting for services to be healthy..."
sleep 5

echo "4. Starting backend API server (with auth disabled)..."
export NODE_ENV=development
export DISABLE_AUTH=true
export DATABASE_URL=postgresql://thesis_validator:thesis_validator_secret@localhost:5432/thesis_validator
export REDIS_HOST=localhost
export REDIS_PORT=6379

npm run dev &
BACKEND_PID=$!

echo "   Backend started (PID: $BACKEND_PID)"
sleep 3

echo "5. Starting research worker..."
npx tsx src/workers/research-worker.ts &
WORKER_PID=$!
echo "   Worker started (PID: $WORKER_PID)"

echo ""
echo "========================================="
echo "System Ready!"
echo "========================================="
echo ""
echo "Backend API:      http://localhost:3000"
echo "Health check:     http://localhost:3000/health"
echo "API docs:         http://localhost:3000/api/v1/engagements"
echo ""
echo "To start the TUI client:"
echo "  cd tui-client"
echo "  npm run dev"
echo ""
echo "To stop all services:"
echo "  kill $BACKEND_PID $WORKER_PID"
echo "  cd thesis-validator && docker compose down"
echo ""
echo "Backend PID:  $BACKEND_PID"
echo "Worker PID:   $WORKER_PID"
echo "========================================="
echo ""
echo "Press Ctrl+C to stop monitoring logs..."
wait $BACKEND_PID
