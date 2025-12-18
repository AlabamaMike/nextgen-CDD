#!/bin/bash

# restart-dev.sh
# Kills any process running on port 3000 and restarts the development server

PORT=3000
echo "🧹 Checking for processes on port $PORT..."

# Find PID of process on port 3000
PID=$(lsof -ti:$PORT)

if [ -n "$PID" ]; then
  echo "⚠️  Found process $PID on port $PORT. Killing it..."
  kill -9 $PID
  echo "✅ Process killed."
else
  echo "✅ No process found on port $PORT."
fi

echo "🚀 Starting development server..."
# Run in background with logging
# Using tsx directly to avoid watch mode EMFILE errors
nohup npx tsx src/index.ts > /tmp/thesis-validator.log 2>&1 &
PID=$!
echo "🚀 Starting Thesis Validator (PID: $PID)..."
