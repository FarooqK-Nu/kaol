from typing import List, Literal
from pydantic import Field
from .base import AppBaseModel
from .segment import SubtitleSegment
from .word import CanonicalWord


class TranscriptionResult(AppBaseModel):
    schema_version: Literal["1.0"] = "1.0"
    language: Literal["ar"] = "ar"
    duration_seconds: float = Field(..., ge=0.0)
    segments: List[SubtitleSegment]
    words: List[CanonicalWord]
