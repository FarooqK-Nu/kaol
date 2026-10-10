from typing import List
from pydantic import Field
from .base import AppBaseModel
from .segment import TranslatedSegment


class TranslationInput(AppBaseModel):
    """
    Minimal translation input. Neighboring segments provide context
    by being grouped together in execution batches.
    """
    id: str = Field(..., pattern=r"^seg_")
    arabic: str = Field(..., min_length=1)


class TranslationOutput(AppBaseModel):
    id: str = Field(..., pattern=r"^seg_")
    english: str = Field(..., min_length=1)


class TranslationProviderInfo(AppBaseModel):
    provider: str
    model: str


class TranslationResult(AppBaseModel):
    segments: List[TranslatedSegment]
    translation: TranslationProviderInfo
