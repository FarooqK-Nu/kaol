from pydantic import Field
from .base import AppBaseModel


class MediaMetadata(AppBaseModel):
    duration_seconds: float = Field(..., ge=0.0)
    container: str
    audio_codec: str
    sample_rate: int = Field(..., gt=0)
    channels: int = Field(..., gt=0)
