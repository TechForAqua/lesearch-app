"""
LeCodeR Python Backend - Main Application
Research Paper Code Reproduction Service
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import initialize_services, router
from .core.config import settings
from .services.paper2agent_service import Paper2AgentService
from .services.supabase_client import SupabaseService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events for FastAPI"""
    # Startup
    logger.info("Starting LeCodeR Backend...")
    try:
        supabase_service = SupabaseService()
        paper2agent_service = Paper2AgentService()

        # Initialize services in routes module
        initialize_services(supabase_service, paper2agent_service)

        logger.info("Services initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        raise

    yield

    # Shutdown
    logger.info("Shutting down LeCodeR Backend...")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Research Paper Code Reproduction Service",
    version=settings.app_version,
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include router
app.include_router(router)


if __name__ == "__main__":
    import uvicorn

    logger.info(f"Starting LeCodeR Backend on {settings.host}:{settings.port}")
    uvicorn.run(
        "lecoder_backend.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.environment == "development",
        log_level="info",
    )
