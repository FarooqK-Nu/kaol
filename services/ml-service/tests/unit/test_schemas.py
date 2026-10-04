import json
from pathlib import Path
import pytest
from pydantic import ValidationError

from app.schemas import (
    Artifact,
    ArtifactType,
    CanonicalWord,
    JobError,
    JobProgress,
    JobResponse,
    JobStatus,
    MediaMetadata,
    PublicError,
    SubtitleSegment,
    TimingQuality,
    TimingSource,
    AlignmentStatus,
    TranscriptionResult,
    TranslatedSegment,
    TranslationInput,
    TranslationOutput,
    TranslationResult,
)

FIXTURES_DIR = Path(__file__).resolve().parents[4] / "packages" / "shared-types" / "fixtures"


def load_fixture(filename: str) -> dict:
    fixture_path = FIXTURES_DIR / filename
    assert fixture_path.exists(), f"Fixture file not found: {fixture_path}"
    with open(fixture_path, "r", encoding="utf-8") as f:
        return json.load(f)


class TestFixtureParity:
    """Verifies that all shared fixtures deserialize cleanly into Pydantic models
    and serialize back to identical camelCase JSON representations."""

    def test_canonical_word_aligned_fixture(self):
        data = load_fixture("canonical-word-aligned.json")
        model = CanonicalWord.model_validate(data)
        assert model.id == "word_000001"
        assert model.start == 4.18
        assert model.end == 4.71
        assert model.timing_source == TimingSource.WHISPERX
        assert model.alignment_status == AlignmentStatus.ALIGNED
        assert model.source_segment_id == 0

        # Assert round-trip serialized dict with camelCase keys matches source fixture
        dumped = model.model_dump(by_alias=True, mode="json")
        assert dumped == data

    def test_canonical_word_unaligned_fixture(self):
        data = load_fixture("canonical-word-unaligned.json")
        model = CanonicalWord.model_validate(data)
        assert model.id == "word_000002"
        assert model.start is None
        assert model.end is None
        assert model.timing_source == TimingSource.UNKNOWN
        assert model.alignment_status == AlignmentStatus.UNALIGNED

        dumped = model.model_dump(by_alias=True, mode="json")
        assert dumped == data

    def test_subtitle_segment_fixture(self):
        data = load_fixture("subtitle-segment.json")
        model = SubtitleSegment.model_validate(data)
        assert model.id == "seg_000001"
        assert model.sequence == 1
        assert model.timing_quality == TimingQuality.ALIGNED
        assert model.duration == 3.74

        dumped = model.model_dump(by_alias=True, mode="json")
        assert dumped == data

    def test_translated_segment_fixture(self):
        data = load_fixture("translated-segment.json")
        model = TranslatedSegment.model_validate(data)
        assert model.id == "seg_000001"
        assert model.english == "Peace be upon you."

        dumped = model.model_dump(by_alias=True, mode="json")
        assert dumped == data

    def test_translation_input_fixture(self):
        data = load_fixture("translation-input.json")
        model = TranslationInput.model_validate(data)
        assert model.id == "seg_000001"
        assert model.arabic == "السلام عليكم ورحمة الله وبركاته"

        dumped = model.model_dump(by_alias=True, mode="json")
        assert dumped == data

    def test_translation_output_fixture(self):
        data = load_fixture("translation-output.json")
        model = TranslationOutput.model_validate(data)
        assert model.id == "seg_000001"
        assert model.english == "Peace be upon you."

        dumped = model.model_dump(by_alias=True, mode="json")
        assert dumped == data

    def test_translation_result_fixture(self):
        data = load_fixture("translation-result.json")
        model = TranslationResult.model_validate(data)
        assert len(model.segments) == 1
        assert model.translation.provider == "opus"

        dumped = model.model_dump(by_alias=True, mode="json")
        assert dumped == data

    def test_transcription_result_fixture(self):
        data = load_fixture("transcription-result.json")
        model = TranscriptionResult.model_validate(data)
        assert model.schema_version == "1.0"
        assert model.language == "ar"
        assert len(model.segments) == 1
        assert len(model.words) == 1

        dumped = model.model_dump(by_alias=True, mode="json")
        assert dumped == data

    def test_media_metadata_fixture(self):
        data = load_fixture("media-metadata.json")
        model = MediaMetadata.model_validate(data)
        assert model.duration_seconds == 154.82
        assert model.sample_rate == 48000

        dumped = model.model_dump(by_alias=True, mode="json")
        assert dumped == data

    def test_public_error_fixture(self):
        data = load_fixture("public-error.json")
        model = PublicError.model_validate(data)
        assert model.code == "TRANSCRIPTION_FAILED"

        dumped = model.model_dump(by_alias=True, mode="json")
        assert dumped == data

    def test_job_error_fixture(self):
        data = load_fixture("job-error.json")
        model = JobError.model_validate(data)
        assert model.code == "TRANSCRIPTION_FAILED"
        assert model.stage == "transcribing"
        assert model.retryable is True

        dumped = model.model_dump(by_alias=True, mode="json", exclude_unset=True)
        assert dumped == data


    def test_job_response_fixture(self):
        data = load_fixture("job-response.json")
        model = JobResponse.model_validate(data)
        assert model.job_id == "job_123"
        assert model.status == JobStatus.TRANSLATING
        assert model.progress is not None
        assert model.progress.stage == JobStatus.TRANSLATING
        assert model.error is None

        dumped = model.model_dump(by_alias=True, mode="json")
        assert dumped == data

    def test_artifact_fixture(self):
        data = load_fixture("artifact.json")
        model = Artifact.model_validate(data)
        assert model.id == "artifact_123"
        assert model.type == ArtifactType.SRT
        assert model.job_id == "job_123"

        dumped = model.model_dump(by_alias=True, mode="json")
        assert dumped == data


class TestSchemaInvariants:
    """Verifies domain constraints, prefix formats, and timing invariants."""

    def test_canonical_word_paired_timing_enforced(self):
        # start without end must fail
        with pytest.raises(ValidationError, match="start and end timestamps must both be present or both be null"):
            CanonicalWord(
                id="word_000001",
                text_raw="test",
                text_normalized="test",
                start=1.0,
                end=None,
                timing_source=TimingSource.WHISPERX,
                alignment_status=AlignmentStatus.ALIGNED,
            )

        # end without start must fail
        with pytest.raises(ValidationError, match="start and end timestamps must both be present or both be null"):
            CanonicalWord(
                id="word_000001",
                text_raw="test",
                text_normalized="test",
                start=None,
                end=2.0,
                timing_source=TimingSource.WHISPERX,
                alignment_status=AlignmentStatus.ALIGNED,
            )

    def test_canonical_word_timing_order_enforced(self):
        # end <= start must fail
        with pytest.raises(ValidationError, match="end timestamp must be strictly greater than start"):
            CanonicalWord(
                id="word_000001",
                text_raw="test",
                text_normalized="test",
                start=2.0,
                end=1.5,
                timing_source=TimingSource.WHISPERX,
                alignment_status=AlignmentStatus.ALIGNED,
            )

        # negative start must fail
        with pytest.raises(ValidationError, match="start timestamp cannot be negative"):
            CanonicalWord(
                id="word_000001",
                text_raw="test",
                text_normalized="test",
                start=-0.5,
                end=1.0,
                timing_source=TimingSource.WHISPERX,
                alignment_status=AlignmentStatus.ALIGNED,
            )

    def test_canonical_word_probability_range(self):
        with pytest.raises(ValidationError):
            CanonicalWord(
                id="word_000001",
                text_raw="test",
                text_normalized="test",
                asr_probability=1.5,
                timing_source=TimingSource.UNKNOWN,
                alignment_status=AlignmentStatus.UNALIGNED,
            )

    def test_id_prefix_enforcement(self):
        # Invalid word ID prefix
        with pytest.raises(ValidationError):
            CanonicalWord(
                id="bad_000001",
                text_raw="test",
                text_normalized="test",
                timing_source=TimingSource.UNKNOWN,
                alignment_status=AlignmentStatus.UNALIGNED,
            )

        # Invalid segment ID prefix
        with pytest.raises(ValidationError):
            SubtitleSegment(
                id="invalid_seg",
                sequence=1,
                start=0.0,
                end=1.0,
                duration=1.0,
                arabic="نص",
                word_ids=["word_1"],
                timing_quality=TimingQuality.ALIGNED,
            )

        # Invalid job ID prefix
        with pytest.raises(ValidationError):
            JobResponse(
                job_id="wrong_id",
                status=JobStatus.QUEUED,
            )

        # Invalid artifact ID prefix
        with pytest.raises(ValidationError):
            Artifact(
                id="file_123",
                type=ArtifactType.SRT,
                filename="sub.srt",
                job_id="job_123",
            )

    def test_segment_duration_consistency(self):
        # duration mismatch with end - start
        with pytest.raises(ValidationError, match="does not match end - start"):
            SubtitleSegment(
                id="seg_000001",
                sequence=1,
                start=1.0,
                end=5.0,
                duration=1.0,  # Expected 4.0
                arabic="نص تجريبي",
                word_ids=["word_000001"],
                timing_quality=TimingQuality.ALIGNED,
            )

    def test_forbid_extra_unknown_fields(self):
        # extra="forbid" prevents unexpected fields from polluting contracts
        with pytest.raises(ValidationError):
            TranslationInput(
                id="seg_000001",
                arabic="نص",
                context_before=["extra context"],
            )
