from enum import Enum
from typing import Optional
from pydantic import Field
from .base import AppBaseModel
from .errors import PublicError


class JobStatus(str, Enum):
    QUEUED = "queued"
    VALIDATING_MEDIA = "validating_media"
    EXTRACTING_AUDIO = "extracting_audio"
    TRANSCRIBING = "transcribing"
    ALIGNING = "aligning"
    NORMALIZING = "normalizing"
    SEGMENTING = "segmenting"
    TRANSLATING = "translating"
    EXPORTING = "exporting"
    COMPLETED = "completed"
    FAILED = "failed"


class JobProgress(AppBaseModel):
    stage: JobStatus


class JobResponse(AppBaseModel):
    """
    Public response schema returned by GET /api/jobs/:jobId.
    """
    job_id: str = Field(..., pattern=r"^job_")
    status: JobStatus
    progress: Optional[JobProgress] = None
    error: Optional[PublicError] = None
