#!/bin/bash
# Run the TUI client for Thesis Validator

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Use NVM if available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Load environment variables from backend .env file (for JWT_SECRET)
if [ -f "$SCRIPT_DIR/thesis-validator/.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/thesis-validator/.env" | grep JWT_SECRET | xargs)
fi

# Generate a fresh auth token
echo "Generating auth token..."
TOKEN_OUTPUT=$(node "$SCRIPT_DIR/thesis-validator/scripts/generate-dev-token.mjs" 2>&1)
AUTH_TOKEN=$(echo "$TOKEN_OUTPUT" | grep -o 'eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*' | head -1)

cd "$SCRIPT_DIR/tui-client"

if [ -z "$AUTH_TOKEN" ]; then
    echo "Warning: Could not generate auth token. Some features may not work."
    echo "Token output was: $TOKEN_OUTPUT"
    npm run dev -- --server http://localhost:3000
else
    echo "Token generated successfully"
    npm run dev -- --server http://localhost:3000 --token "$AUTH_TOKEN"
fi
