"""
API routes for LeCodeR backend
"""
import asyncio
import logging
import os
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from fastapi.responses import FileResponse

from ..models.schemas import (
    CreateJobRequest,
    CreateJobResponse,
    HealthResponse,
    JobStatus,
    JobStatusResponse,
)
from ..services.paper2agent_service import Paper2AgentService
from ..services.supabase_client import SupabaseService

logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Global services (will be initialized in main app)
supabase_service: Optional[SupabaseService] = None
paper2agent_service: Optional[Paper2AgentService] = None


def initialize_services(supabase: SupabaseService, paper2agent: Paper2AgentService):
    """Initialize global service instances"""
    global supabase_service, paper2agent_service
    supabase_service = supabase
    paper2agent_service = paper2agent


async def process_job_async(
    job_id: UUID,
    paper_url: Optional[str],
    repo_url: str,
    user_intent: str,
    model_preference: str,
):
    """Background task to process a reproduction job"""
    logger.info(f"Processing job {job_id} in background")

    try:
        # Status update callback
        async def update_status(job_id: UUID, status: JobStatus, progress: int):
            await supabase_service.update_job_status(job_id, status)
            logger.info(f"Job {job_id} - Status: {status.value}, Progress: {progress}%")

        # Run the reproduction pipeline
        results = await paper2agent_service.reproduce_paper(
            job_id=job_id,
            paper_url=paper_url,
            repo_url=repo_url,
            user_intent=user_intent,
            model_preference=model_preference,
            status_callback=update_status,
        )

        # Upload ZIP to Supabase Storage
        zip_path = results.get("zip_path")
        if zip_path and os.path.exists(zip_path):
            with open(zip_path, "rb") as f:
                zip_data = f.read()

            download_url = await supabase_service.upload_file(
                bucket="reproductions",
                path=f"{job_id}/reproduction.zip",
                file_data=zip_data,
                content_type="application/zip",
            )

            # Update job as completed
            await supabase_service.update_job_status(
                job_id,
                JobStatus.COMPLETED,
                generated_files=results.get("generated_files"),
                zip_path=zip_path,
                download_url=download_url,
                time_taken=results.get("time_taken"),
                success_rate=results.get("validation", {}).get("success_rate"),
            )

            logger.info(f"Job {job_id} completed successfully")
        else:
            raise Exception("ZIP file not generated")

    except Exception as e:
        logger.error(f"Error processing job {job_id}: {str(e)}")
        await supabase_service.update_job_status(job_id, JobStatus.FAILED)


@router.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint - health check"""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        paper2agent_available=paper2agent_service.paper2agent_available
        if paper2agent_service
        else False,
    )


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    if not supabase_service or not paper2agent_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Services not initialized",
        )

    return HealthResponse(
        status="healthy",
        version="1.0.0",
        paper2agent_available=paper2agent_service.paper2agent_available,
    )


@router.post("/jobs", response_model=CreateJobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(request: CreateJobRequest, background_tasks: BackgroundTasks):
    """Create a new reproduction job"""
    if not supabase_service or not paper2agent_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Services not initialized",
        )

    try:
        # TODO: Extract user_id from JWT token
        # For now, use a placeholder
        user_id = UUID("00000000-0000-0000-0000-000000000000")

        # Create job in database
        job = await supabase_service.create_job(
            user_id=user_id,
            repo_url=str(request.repo_url),
            user_intent=request.user_intent,
            model_used=request.model_preference or "claude",
            paper_url=str(request.paper_url) if request.paper_url else None,
        )

        # Start processing in background
        background_tasks.add_task(
            process_job_async,
            job.id,
            str(request.paper_url) if request.paper_url else None,
            str(request.repo_url),
            request.user_intent,
            request.model_preference or "claude",
        )

        logger.info(f"Created job {job.id}")

        return CreateJobResponse(
            job_id=job.id,
            status=JobStatus.PENDING,
            estimated_time=1800,  # 30 minutes estimate
            status_url=f"/jobs/{job.id}",
        )

    except Exception as e:
        logger.error(f"Error creating job: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create job: {str(e)}",
        )


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: UUID):
    """Get the status of a reproduction job"""
    if not supabase_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Services not initialized",
        )

    try:
        job = await supabase_service.get_job(job_id)

        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job {job_id} not found",
            )

        # Calculate progress based on status
        progress_map = {
            JobStatus.PENDING: 0,
            JobStatus.ANALYZING: 25,
            JobStatus.GENERATING: 50,
            JobStatus.VALIDATING: 75,
            JobStatus.PACKAGING: 90,
            JobStatus.COMPLETED: 100,
            JobStatus.FAILED: 0,
        }

        # Stage descriptions
        stage_map = {
            JobStatus.PENDING: "Waiting to start...",
            JobStatus.ANALYZING: "Analyzing paper methodology and repository structure...",
            JobStatus.GENERATING: "Generating reproduction code and setup instructions...",
            JobStatus.VALIDATING: "Validating generated code and checking dependencies...",
            JobStatus.PACKAGING: "Packaging results into downloadable archive...",
            JobStatus.COMPLETED: "Reproduction complete! Ready to download.",
            JobStatus.FAILED: "Job failed. Please check error details.",
        }

        # Build result if completed
        result = None
        if job.status == JobStatus.COMPLETED and job.download_url:
            from datetime import timedelta

            result = {
                "download_url": job.download_url,
                "expires_at": (
                    job.completed_at + timedelta(days=7) if job.completed_at else None
                ),
                "files_generated": len(job.generated_files or {}),
                "time_taken": job.time_taken or 0,
            }

        return JobStatusResponse(
            job_id=job.id,
            status=job.status,
            progress=progress_map.get(job.status, 0),
            current_stage=stage_map.get(job.status, "Processing..."),
            result=result,
            error=None,
            created_at=job.created_at,
            updated_at=job.updated_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching job status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch job status: {str(e)}",
        )


@router.get("/jobs/{job_id}/download")
async def download_job_result(job_id: UUID):
    """Download the ZIP file for a completed job"""
    if not supabase_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Services not initialized",
        )

    try:
        job = await supabase_service.get_job(job_id)

        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job {job_id} not found",
            )

        if job.status != JobStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Job is not completed yet. Current status: {job.status.value}",
            )

        if not job.zip_path or not os.path.exists(job.zip_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Download file not found",
            )

        return FileResponse(
            path=job.zip_path,
            media_type="application/zip",
            filename=f"reproduction_{job_id}.zip",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading job result: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download result: {str(e)}",
        )
