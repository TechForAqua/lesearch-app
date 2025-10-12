#!/bin/bash
# Test script using uv

set -e

echo "🧪 Running tests with pytest..."
echo "📦 Using uv for package management"
echo ""

uv run pytest tests/ -v --cov=lecoder_backend --cov-report=term-missing
