#!/bin/bash
# Production server script using uv

set -e

# Change to the backend root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}/.." || exit 1

echo "🚀 Starting LeCodeR Backend in production mode..."
echo "📦 Using uv for package management"
echo "📁 Working directory: $(pwd)"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    exit 1
fi

# Run with uv (no reload in production)
echo "🔧 Environment: production"
echo "🌐 Server starting..."
echo ""

uv run uvicorn lecoder_backend.main:app --host 0.0.0.0 --port 8000 --workers 4
