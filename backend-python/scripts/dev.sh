#!/bin/bash
# Development server script using uv

set -e

# Change to the backend root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}/.." || exit 1

echo "🚀 Starting LeCodeR Backend in development mode..."
echo "📦 Using uv for package management"
echo "📁 Working directory: $(pwd)"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found"
    echo "📝 Creating from .env.example..."
    cp .env.example .env
    echo "✏️  Please edit .env with your credentials before continuing"
    exit 1
fi

# Run with uv
echo "🔧 Environment: development"
echo "🌐 Server will start at http://localhost:8000"
echo "📚 API docs at http://localhost:8000/docs"
echo ""

uv run uvicorn lecoder_backend.main:app --reload --host 0.0.0.0 --port 8000
