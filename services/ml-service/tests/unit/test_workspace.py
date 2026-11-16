import os
import pytest
from pathlib import Path
from app.media.workspace import (
    JobWorkspace,
    WorkspacePathTraversalError,
    WorkspaceFileNotFoundError,
    AmbiguousInputMediaError,
    InvalidJobIdError,
    InvalidFilenameError,
    AUDIO_FILENAME,
    WORDS_FILENAME,
    SEGMENTS_FILENAME,
    TRANSLATIONS_FILENAME,
    OUTPUT_SRT_FILENAME,
)


@pytest.fixture
def temp_workspace_root(tmp_path: Path) -> Path:
    jobs_dir = tmp_path / "data" / "jobs"
    jobs_dir.mkdir(parents=True, exist_ok=True)
    return jobs_dir


def test_canonical_file_paths(temp_workspace_root: Path):
    job_id = "job_test123456"
    workspace = JobWorkspace(job_id, base_dir=temp_workspace_root)

    assert workspace.audio_path.name == AUDIO_FILENAME
    assert workspace.words_path.name == WORDS_FILENAME
    assert workspace.segments_path.name == SEGMENTS_FILENAME
    assert workspace.translations_path.name == TRANSLATIONS_FILENAME
    assert workspace.output_srt_path.name == OUTPUT_SRT_FILENAME


def test_workspace_ensure_and_cleanup(temp_workspace_root: Path):
    job_id = "job_test123456"
    workspace = JobWorkspace(job_id, base_dir=temp_workspace_root)

    assert not workspace.workspace_dir.exists()
    workspace.ensure_workspace()
    assert workspace.workspace_dir.exists()

    workspace.cleanup()
    assert not workspace.workspace_dir.exists()


def test_resolve_input_path_variants(temp_workspace_root: Path):
    job_id = "job_test123456"
    workspace = JobWorkspace(job_id, base_dir=temp_workspace_root)
    workspace.ensure_workspace()

    # 1. 0 matches -> None
    assert workspace.resolve_input_path() is None

    # 2. Exactly 1 match -> returns Path
    input_file = workspace.workspace_dir / "input.mp4"
    input_file.write_bytes(b"fake media")
    resolved = workspace.resolve_input_path()
    assert resolved == input_file

    # Dot-prefixed temporary files should be ignored
    temp_file = workspace.workspace_dir / ".input.mp4.1234.tmp"
    temp_file.write_bytes(b"temp")
    assert workspace.resolve_input_path() == input_file

    # 3. Multiple input files -> AmbiguousInputMediaError
    second_input = workspace.workspace_dir / "input.wav"
    second_input.write_bytes(b"second fake media")
    with pytest.raises(AmbiguousInputMediaError):
        workspace.resolve_input_path()


def test_get_input_path_sanitization(temp_workspace_root: Path):
    job_id = "job_test123456"
    workspace = JobWorkspace(job_id, base_dir=temp_workspace_root)

    assert workspace.get_input_path("mp4").name == "input.mp4"
    assert workspace.get_input_path(".wav").name == "input.wav"

    with pytest.raises(InvalidFilenameError):
        workspace.get_input_path("../evil")

    with pytest.raises(InvalidFilenameError):
        workspace.get_input_path("mp4/bad")

    with pytest.raises(InvalidFilenameError):
        workspace.get_input_path("")


def test_atomic_file_io_utf8(temp_workspace_root: Path):
    job_id = "job_test123456"
    workspace = JobWorkspace(job_id, base_dir=temp_workspace_root)

    # Arabic text write and read
    arabic_text = "مرحبا بالعالم - تجربة تخزين النصوص العربية بأمان"
    target_path = workspace.write_text("test_arabic.txt", arabic_text)
    assert target_path.exists()
    assert workspace.read_text("test_arabic.txt") == arabic_text

    # JSON write and read
    payload = {
        "jobId": job_id,
        "segments": [{"id": "seg_001", "arabic": "نص مترجم", "duration": 2.5}],
    }
    workspace.write_json("test_payload.json", payload)
    read_data = workspace.read_json("test_payload.json")
    assert read_data == payload

    # Deletion primitive
    assert workspace.delete_file("test_arabic.txt") is True
    with pytest.raises(WorkspaceFileNotFoundError):
        workspace.delete_file("test_arabic.txt")


def test_job_id_validation(temp_workspace_root: Path):
    # Too short (<10 chars)
    with pytest.raises(InvalidJobIdError):
        JobWorkspace("job_1", base_dir=temp_workspace_root)
    with pytest.raises(InvalidJobIdError):
        JobWorkspace("job_1234", base_dir=temp_workspace_root)

    # Too long (>64 chars)
    with pytest.raises(InvalidJobIdError):
        JobWorkspace("job_" + "x" * 61, base_dir=temp_workspace_root)

    # Missing job_ prefix
    with pytest.raises(InvalidJobIdError):
        JobWorkspace("media_1234567890", base_dir=temp_workspace_root)

    # Directory traversal in job_id
    with pytest.raises(WorkspacePathTraversalError):
        JobWorkspace("job_../etc1234", base_dir=temp_workspace_root)
    with pytest.raises(WorkspacePathTraversalError):
        JobWorkspace("job_..\\etc1234", base_dir=temp_workspace_root)
    with pytest.raises(WorkspacePathTraversalError):
        JobWorkspace("job_sub/job_12", base_dir=temp_workspace_root)
    with pytest.raises(WorkspacePathTraversalError):
        JobWorkspace("job_sub\\job_12", base_dir=temp_workspace_root)
    with pytest.raises(WorkspacePathTraversalError):
        JobWorkspace("job_1234\x005678", base_dir=temp_workspace_root)

    # Windows drive letter syntax
    with pytest.raises(WorkspacePathTraversalError):
        JobWorkspace("C:\\job_123456", base_dir=temp_workspace_root)


def test_filename_validation(temp_workspace_root: Path):
    workspace = JobWorkspace("job_test123456", base_dir=temp_workspace_root)

    # Relative path traversal
    with pytest.raises(WorkspacePathTraversalError):
        workspace.get_path("../secret.txt")
    with pytest.raises(WorkspacePathTraversalError):
        workspace.get_path("..\\secret.txt")
    with pytest.raises(WorkspacePathTraversalError):
        workspace.get_path("sub/file.txt")
    with pytest.raises(WorkspacePathTraversalError):
        workspace.get_path("sub\\file.txt")

    # Absolute paths
    with pytest.raises(WorkspacePathTraversalError):
        workspace.get_path("C:\\Windows\\System32\\cmd.exe")
    with pytest.raises(WorkspacePathTraversalError):
        workspace.get_path("D:/evil.sh")
    with pytest.raises(WorkspacePathTraversalError):
        workspace.get_path("/etc/passwd")
    with pytest.raises(WorkspacePathTraversalError):
        workspace.get_path("\\Windows\\System32")

    # Null bytes
    with pytest.raises(WorkspacePathTraversalError):
        workspace.get_path("file\0.txt")

    # Windows illegal characters
    with pytest.raises(InvalidFilenameError):
        workspace.get_path("file:stream.txt")
    with pytest.raises(InvalidFilenameError):
        workspace.get_path("file*.txt")
    with pytest.raises(InvalidFilenameError):
        workspace.get_path("file?.txt")
    with pytest.raises(InvalidFilenameError):
        workspace.get_path('file"name.txt')
    with pytest.raises(InvalidFilenameError):
        workspace.get_path("file<name.txt")
    with pytest.raises(InvalidFilenameError):
        workspace.get_path("file>name.txt")
    with pytest.raises(InvalidFilenameError):
        workspace.get_path("file|name.txt")

    # Empty or dot
    with pytest.raises(InvalidFilenameError):
        workspace.get_path(".")
    with pytest.raises(InvalidFilenameError):
        workspace.get_path("  ")


def test_prefix_collision_prevention(temp_workspace_root: Path):
    base_id = "job_1111111111"
    sibling_id = "job_111111111122"

    w1 = JobWorkspace(base_id, base_dir=temp_workspace_root)
    w2 = JobWorkspace(sibling_id, base_dir=temp_workspace_root)

    assert w1.workspace_dir != w2.workspace_dir
    assert not str(w2.workspace_dir).startswith(str(w1.workspace_dir) + os.sep)
