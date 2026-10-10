from enum import Enum
from typing import List, Optional
from pydantic import Field, model_validator
from .base import AppBaseModel


class TimingQuality(str, Enum):
    ALIGNED = "aligned"
    ESTIMATED = "estimated"
    FALLBACK = "fallback"


class SubtitleSegment(AppBaseModel):
    id: str = Field(..., pattern=r"^seg_")
    sequence: int = Field(..., ge=1)
    start: float = Field(..., ge=0.0)
    end: float = Field(..., gt=0.0)
    duration: float = Field(..., ge=0.0)
    arabic: str = Field(..., min_length=1)
    word_ids: List[str]
    timing_quality: TimingQuality
    average_asr_probability: Optional[float] = Field(None, ge=0.0, le=1.0)

    @model_validator(mode="after")
    def validate_segment_timing(self) -> "SubtitleSegment":
        if self.end <= self.start:
            raise ValueError("end must be strictly greater than start")
        computed = round(self.end - self.start, 4)
        if abs(self.duration - computed) > 0.05:
            raise ValueError(f"duration ({self.duration}) does not match end - start ({computed})")
        return self


class TranslatedSegment(AppBaseModel):
    id: str = Field(..., pattern=r"^seg_")
    sequence: int = Field(..., ge=1)
    start: float = Field(..., ge=0.0)
    end: float = Field(..., gt=0.0)
    duration: Optional[float] = None
    arabic: str = Field(..., min_length=1)
    english: str = Field(..., min_length=1)
    word_ids: List[str]
    timing_quality: Optional[TimingQuality] = None

    @model_validator(mode="after")
    def validate_translated_timing(self) -> "TranslatedSegment":
        if self.end <= self.start:
            raise ValueError("end must be strictly greater than start")
        return self
