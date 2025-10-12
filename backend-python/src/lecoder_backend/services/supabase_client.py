"""
Supabase client service for database operations
"""
import os
from datetime import datetime, timedelta
from typing import Any, Optional
from uuid import UUID

from supabase import Client, create_client

from models.schemas import JobStatus, ReproductionJob


class SupabaseService:
    """Service for interacting with Supabase"""

    def __init__(self):
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")

        self.client: Client = create_client(supabase_url, supabase_key)

    async def create_job(
        self,
        user_id: UUID,
        repo_url: str,
        user_intent: str,
        model_used: str,
        paper_url: Optional[str] = None,
        paper_title: Optional[str] = None,
    ) -> ReproductionJob:
        """Create a new reproduction job in the database"""

        data = {
            "user_id": str(user_id),
            "status": JobStatus.PENDING.value,
            "repo_url": repo_url,
            "user_intent": user_intent,
            "model_used": model_used,
            "paper_url": paper_url,
            "paper_title": paper_title,
        }

        result = self.client.table("reproduction_jobs").insert(data).execute()

        if not result.data:
            raise Exception("Failed to create job")

        return ReproductionJob(**result.data[0])

    async def get_job(self, job_id: UUID) -> Optional[ReproductionJob]:
        """Get a job by ID"""

        result = (
            self.client.table("reproduction_jobs")
            .select("*")
            .eq("id", str(job_id))
            .execute()
        )

        if not result.data:
            return None

        return ReproductionJob(**result.data[0])

    async def get_user_jobs(
        self, user_id: UUID, limit: int = 10, offset: int = 0
    ) -> list[ReproductionJob]:
        """Get all jobs for a user"""

        result = (
            self.client.table("reproduction_jobs")
            .select("*")
            .eq("user_id", str(user_id))
            .order("created_at", desc=True)
            .limit(limit)
            .range(offset, offset + limit - 1)
            .execute()
        )

        return [ReproductionJob(**job) for job in result.data]

    async def update_job_status(
        self,
        job_id: UUID,
        status: JobStatus,
        **kwargs: Any,
    ) -> ReproductionJob:
        """Update job status and optionally other fields"""

        update_data = {
            "status": status.value,
            "updated_at": datetime.utcnow().isoformat(),
        }

        # Add optional fields if provided
        if "paper_title" in kwargs:
            update_data["paper_title"] = kwargs["paper_title"]
        if "generated_files" in kwargs:
            update_data["generated_files"] = kwargs["generated_files"]
        if "agent_md_path" in kwargs:
            update_data["agent_md_path"] = kwargs["agent_md_path"]
        if "zip_path" in kwargs:
            update_data["zip_path"] = kwargs["zip_path"]
        if "download_url" in kwargs:
            update_data["download_url"] = kwargs["download_url"]
        if "time_taken" in kwargs:
            update_data["time_taken"] = kwargs["time_taken"]
        if "success_rate" in kwargs:
            update_data["success_rate"] = kwargs["success_rate"]

        if status == JobStatus.COMPLETED or status == JobStatus.FAILED:
            update_data["completed_at"] = datetime.utcnow().isoformat()

        result = (
            self.client.table("reproduction_jobs")
            .update(update_data)
            .eq("id", str(job_id))
            .execute()
        )

        if not result.data:
            raise Exception(f"Failed to update job {job_id}")

        return ReproductionJob(**result.data[0])

    async def upload_file(
        self, bucket: str, path: str, file_data: bytes, content_type: str = "application/octet-stream"
    ) -> str:
        """Upload a file to Supabase Storage"""

        result = self.client.storage.from_(bucket).upload(
            path, file_data, {"content-type": content_type}
        )

        if not result:
            raise Exception("Failed to upload file")

        # Generate public URL (with expiry)
        expires_in = int(timedelta(days=7).total_seconds())
        url = self.client.storage.from_(bucket).create_signed_url(path, expires_in)

        if not url:
            raise Exception("Failed to generate download URL")

        return url.get("signedURL", "")

    async def delete_old_jobs(self, days: int = 7) -> int:
        """Delete jobs older than specified days"""

        cutoff_date = datetime.utcnow() - timedelta(days=days)

        result = (
            self.client.table("reproduction_jobs")
            .delete()
            .lt("created_at", cutoff_date.isoformat())
            .execute()
        )

        return len(result.data) if result.data else 0
