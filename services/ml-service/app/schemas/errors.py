from typing import Any, Dict, Optional
from .base import AppBaseModel


class PublicError(AppBaseModel):
    """
    Public sanitized error representation exposed over client APIs.
    Contains zero stack traces or internal implementation details.
    """
    code: str
    message: str


class JobError(AppBaseModel):
    """
    Internal error contract used across processing pipelines, workers, and telemetry.
    """
    code: str
    message: str
    stage: str
    retryable: bool
    details: Optional[Dict[str, Any]] = None
