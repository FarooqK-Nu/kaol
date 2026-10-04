from enum import Enum
from typing import Optional
from pydantic import Field, model_validator
from .base import AppBaseModel


class TimingSource(str, Enum):
    WHISPERX = "whisperx"
    FASTER_WHISPER = "faster_whisper"
    ESTIMATED = "estimated"
    UNKNOWN = "unknown"


class AlignmentStatus(str, Enum):
    ALIGNED = "aligned"
    ESTIMATED = "estimated"
    UNALIGNED = "unaligned"


class CanonicalWord(AppBaseModel):
    id: str = Field(..., pattern=r"^word_")
    text_raw: str
    text_normalized: str
    start: Optional[float] = None
    end: Optional[float] = None
    asr_probability: Optional[float] = Field(None, ge=0.0, le=1.0)
    timing_source: TimingSource
    alignment_status: AlignmentStatus
    source_segment_id: Optional[int] = None

    @model_validator(mode="after")
    def validate_timing_pairing(self) -> "CanonicalWord":
        # Start and end timestamps must both be present, or both be null
        if (self.start is None) != (self.end is None):
            raise ValueError("start and end timestamps must both be present or both be null")

        if self.start is not None and self.end is not None:
            if self.start < 0:
                raise ValueError("start timestamp cannot be negative")
            if self.end <= self.start:
                raise ValueError("end timestamp must be strictly greater than start timestamp")

        return self
