"""
Pydantic models for LeCodeR API
"""
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


class JobStatus(str, Enum):
    """Status of a reproduction job"""

    PENDING = "pending"
    ANALYZING = "analyzing"
    GENERATING = "generating"
    VALIDATING = "validating"
    PACKAGING = "packaging"
    COMPLETED = "completed"
    FAILED = "failed"


class CreateJobRequest(BaseModel):
    """Request to create a new reproduction job"""

    paper_url: Optional[HttpUrl] = Field(None, description="arXiv URL or uploaded PDF URL")
    repo_url: HttpUrl = Field(..., description="GitHub repository URL")
    user_intent: str = Field(..., description="What the user wants to achieve")
    model_preference: Optional[str] = Field("claude", description="AI model: 'claude' or 'gemini'")

    model_config = {"json_schema_extra": {"example": {
        "paper_url": "https://arxiv.org/abs/1706.03762",
        "repo_url": "https://github.com/tensorflow/tensor2tensor",
        "user_intent": "Reproduce the Transformer model results from the paper",
        "model_preference": "claude"
    }}}


class CreateJobResponse(BaseModel):
    """Response after creating a job"""

    job_id: UUID
    status: JobStatus
    estimated_time: int = Field(..., description="Estimated completion time in seconds")
    status_url: str = Field(..., description="URL to check job status")

    model_config = {"json_schema_extra": {"example": {
        "job_id": "550e8400-e29b-41d4-a716-446655440000",
        "status": "pending",
        "estimated_time": 1800,
        "status_url": "/api/lecoder/status/550e8400-e29b-41d4-a716-446655440000"
    }}}


class JobResult(BaseModel):
    """Result of a completed job"""

    download_url: str
    expires_at: datetime
    files_generated: int
    time_taken: int = Field(..., description="Time taken in seconds")


class JobStatusResponse(BaseModel):
    """Response for job status check"""

    job_id: UUID
    status: JobStatus
    progress: int = Field(..., ge=0, le=100, description="Progress percentage")
    current_stage: str = Field(..., description="Current processing stage description")
    result: Optional[JobResult] = None
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"json_schema_extra": {"example": {
        "job_id": "550e8400-e29b-41d4-a716-446655440000",
        "status": "analyzing",
        "progress": 25,
        "current_stage": "Analyzing paper methodology and extracting key components...",
        "result": None,
        "error": None,
        "created_at": "2025-10-11T10:00:00Z",
        "updated_at": "2025-10-11T10:05:00Z"
    }}}


class ReproductionJob(BaseModel):
    """Complete reproduction job model"""

    id: UUID
    user_id: UUID
    status: JobStatus
    paper_url: Optional[str] = None
    paper_title: Optional[str] = None
    repo_url: str
    user_intent: str
    generated_files: Optional[dict[str, Any]] = None
    agent_md_path: Optional[str] = None
    zip_path: Optional[str] = None
    download_url: Optional[str] = None
    time_taken: Optional[int] = None
    model_used: str
    success_rate: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None


class ErrorResponse(BaseModel):
    """Error response model"""

    error: str
    detail: Optional[str] = None
    job_id: Optional[UUID] = None

    model_config = {"json_schema_extra": {"example": {
        "error": "Job not found",
        "detail": "No job exists with the provided ID",
        "job_id": "550e8400-e29b-41d4-a716-446655440000"
    }}}


class HealthResponse(BaseModel):
    """Health check response"""

    status: str
    version: str
    paper2agent_available: bool
