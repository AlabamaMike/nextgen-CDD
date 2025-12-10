#!/bin/bash
# Stop the thesis-validator backend server

# Find and kill processes running on port 3000 (default API port)
PORT=${1:-3000}

echo "Stopping backend server on port $PORT..."

# Find PIDs listening on the port
PIDS=$(lsof -t -i:$PORT 2>/dev/null)

if [ -z "$PIDS" ]; then
    echo "No process found running on port $PORT"
    exit 0
fi

# Kill each process
for PID in $PIDS; do
    echo "Killing process $PID"
    kill $PID 2>/dev/null

    # Wait a moment and force kill if still running
    sleep 1
    if kill -0 $PID 2>/dev/null; then
        echo "Force killing process $PID"
        kill -9 $PID 2>/dev/null
    fi
done

echo "Backend server stopped"
