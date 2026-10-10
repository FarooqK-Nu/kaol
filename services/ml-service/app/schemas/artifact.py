from enum import Enum
from pydantic import Field
from .base import AppBaseModel


class ArtifactType(str, Enum):
    SRT = "srt"
    VTT = "vtt"
    AUDIO = "audio"
    WORDS = "words"
    SEGMENTS = "segments"
    TRANSLATIONS = "translations"


class Artifact(AppBaseModel):
    id: str = Field(..., pattern=r"^artifact_")
    type: ArtifactType
    filename: str
    job_id: str = Field(..., pattern=r"^job_")
