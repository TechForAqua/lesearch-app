# LeCodeR Python Backend

FastAPI backend service for the LeCodeR research paper reproduction system.

## Overview

This backend provides the core Paper2Agent integration that powers automated research paper code reproduction. It handles:

- Paper analysis and methodology extraction
- Code generation using AI models (Claude, Gemini)
- Validation and testing
- Result packaging and storage

## Prerequisites

- Python 3.11 or higher
- [uv](https://docs.astral.sh/uv/) - Fast Python package manager
- Supabase account with configured database

## Installation

### 1. Install uv

If you don't have uv installed yet:

```bash
# On macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# On Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# Or via pip
pip install uv

# Or via Homebrew
brew install uv
```

### 2. Set Up Project

Clone the repository and navigate to the backend directory:

```bash
cd backend-python
```

### 3. Install Dependencies

uv will automatically create an isolated virtual environment and install all dependencies defined in `pyproject.toml`:

```bash
uv sync
```

This command will:
- Create a `.venv/` directory with an isolated Python environment
- Install all 88+ required packages
- Lock dependencies to ensure reproducible builds

### 4. Install Paper2Agent

Paper2Agent needs to be installed from GitHub:

```bash
uv pip install git+https://github.com/jmiao24/Paper2Agent.git
```

### 5. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# AI Models
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...

# Server
HOST=0.0.0.0
PORT=8000
ALLOWED_ORIGINS=http://localhost:3000

# Configuration
MAX_PROCESSING_TIME=3600
FILE_RETENTION_DAYS=7
```

## Running the Server

### Development Mode (Recommended)

Use the convenience script that includes auto-reload:

```bash
./scripts/dev.sh
```

This will:
- Check for `.env` file (creates from example if missing)
- Start uvicorn with hot-reload enabled
- Run at http://localhost:8000

Or run directly with uv:

```bash
uv run uvicorn lecoder_backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Production Mode

Use the production script with multiple workers:

```bash
./scripts/prod.sh
```

Or run directly:

```bash
uv run uvicorn lecoder_backend.main:app --host 0.0.0.0 --port 8000 --workers 4
```

The API will be available at:
- API: http://localhost:8000
- Interactive Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "paper2agent_available": true
}
```

### Create Job

```bash
POST /jobs
Content-Type: application/json

{
  "paper_url": "https://arxiv.org/abs/1706.03762",
  "repo_url": "https://github.com/tensorflow/tensor2tensor",
  "user_intent": "Reproduce the Transformer model results",
  "model_preference": "claude"
}
```

Response:
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "estimated_time": 1800,
  "status_url": "/jobs/550e8400-e29b-41d4-a716-446655440000"
}
```

### Get Job Status

```bash
GET /jobs/{job_id}
```

Response:
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "analyzing",
  "progress": 25,
  "current_stage": "Analyzing paper methodology...",
  "result": null,
  "error": null,
  "created_at": "2025-10-11T10:00:00Z",
  "updated_at": "2025-10-11T10:05:00Z"
}
```

### Download Result

```bash
GET /jobs/{job_id}/download
```

Returns: ZIP file download

## Project Structure

```
backend-python/
├── pyproject.toml          # uv project configuration & dependencies
├── uv.lock                 # Locked dependency versions (auto-generated)
├── .env                    # Environment variables (not in git)
├── .env.example           # Example environment configuration
├── scripts/
│   ├── dev.sh             # Development server launcher
│   └── prod.sh            # Production server launcher
├── src/
│   └── lecoder_backend/   # Main Python package
│       ├── __init__.py
│       ├── main.py        # FastAPI application entry point
│       ├── api/
│       │   ├── __init__.py
│       │   └── routes.py  # All API endpoints
│       ├── core/
│       │   ├── __init__.py
│       │   └── config.py  # Settings and configuration
│       ├── models/
│       │   ├── __init__.py
│       │   └── schemas.py # Pydantic data models
│       ├── services/
│       │   ├── __init__.py
│       │   ├── supabase_client.py    # Supabase integration
│       │   └── paper2agent_service.py # Paper2Agent wrapper
│       └── utils/
│           └── __init__.py
└── generated/             # Output directory for generated code
```

## Development

### Adding Dependencies

To add a new dependency:

```bash
# Add to dependencies
uv add package-name

# Add to dev dependencies
uv add --dev package-name

# Example: Add requests
uv add requests
```

This will update `pyproject.toml` and `uv.lock` automatically.

### Removing Dependencies

```bash
uv remove package-name
```

### Testing the API

Use the interactive API documentation at http://localhost:8000/docs to test endpoints.

Or use curl:

```bash
# Health check
curl http://localhost:8000/health

# Create a job
curl -X POST http://localhost:8000/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "paper_url": "https://arxiv.org/abs/1706.03762",
    "repo_url": "https://github.com/tensorflow/tensor2tensor",
    "user_intent": "Reproduce results",
    "model_preference": "claude"
  }'

# Check job status
curl http://localhost:8000/jobs/{job_id}
```

### Running Tests

When tests are added:

```bash
uv run pytest
```

### Code Formatting and Linting

```bash
# Format code with black
uv run black .

# Lint with ruff
uv run ruff check .

# Auto-fix linting issues
uv run ruff check --fix .
```

### Logs

Logs are printed to stdout. In production, configure a proper logging system.

## Deployment

### Docker Deployment

Create a `Dockerfile` in the backend-python directory:

```dockerfile
FROM python:3.11-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy project files
COPY pyproject.toml uv.lock ./
COPY src ./src

# Install dependencies
RUN uv sync --frozen --no-dev

# Install Paper2Agent
RUN uv pip install git+https://github.com/jmiao24/Paper2Agent.git

# Expose port
EXPOSE 8000

# Run the application
CMD ["uv", "run", "uvicorn", "lecoder_backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

Build and run:

```bash
docker build -t lecoder-backend .
docker run -p 8000:8000 --env-file .env lecoder-backend
```

## Troubleshooting

### uv Command Not Found

If `uv` is not recognized after installation:

1. Restart your terminal
2. Check PATH configuration
3. Try installing via alternative method (pip, homebrew)

### Paper2Agent Not Found

If you get import errors for Paper2Agent:

```bash
uv pip install git+https://github.com/jmiao24/Paper2Agent.git
```

### Supabase Connection Error

1. Check your `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `.env`
2. Ensure the `reproduction_jobs` table exists in your database
3. Check that RLS policies allow service role access

### Port Already in Use

Change the port in `.env`:

```bash
PORT=8001
```

Then restart the server.

### Module Not Found Errors

If you get `ModuleNotFoundError`:

1. Ensure you're running commands with `uv run` prefix
2. Check that `uv sync` completed successfully
3. Verify the `.venv/` directory exists

### Scripts Permission Denied

Make scripts executable:

```bash
chmod +x scripts/dev.sh scripts/prod.sh
```

## Package Management with uv

### Why uv?

- **10-100x faster** than pip
- **Deterministic** dependency resolution
- **Built-in virtual environment** management
- **Compatible** with existing Python tools
- **Modern** and actively maintained by Astral (creators of Ruff)

### Common Commands

```bash
# Install dependencies from pyproject.toml
uv sync

# Add a new package
uv add package-name

# Remove a package
uv remove package-name

# Update all dependencies
uv sync --upgrade

# Run a command in the virtual environment
uv run python script.py

# Run uvicorn
uv run uvicorn lecoder_backend.main:app

# Install specific version
uv add "package-name==1.2.3"

# View installed packages
uv pip list
```

## Next Steps

1. ✅ Install uv package manager
2. ✅ Run `uv sync` to install dependencies
3. ⏳ Install Paper2Agent from GitHub
4. ⏳ Create the `reproduction_jobs` table in Supabase (should already exist)
5. ⏳ Test with development server: `./scripts/dev.sh`
6. ⏳ Test with a simple research paper
7. ⏳ Integrate with Next.js frontend

## Resources

- [uv Documentation](https://docs.astral.sh/uv/)
- [Paper2Agent GitHub](https://github.com/jmiao24/Paper2Agent)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Supabase Python Client](https://supabase.com/docs/reference/python/introduction)
- [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
