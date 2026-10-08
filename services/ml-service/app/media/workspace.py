import json
import os
import re
import shutil
import uuid
from pathlib import Path
from typing import Any, Optional
from app.config import settings

JOB_ID_REGEX = re.compile(r"^job_[a-zA-Z0-9_-]+$")
MIN_JOB_ID_LENGTH = 10
MAX_JOB_ID_LENGTH = 64

# Canonical Filenames
AUDIO_FILENAME = "audio.wav"
WORDS_FILENAME = "words.json"
SEGMENTS_FILENAME = "segments.json"
TRANSLATIONS_FILENAME = "translations.json"
OUTPUT_SRT_FILENAME = "output.srt"


class WorkspaceError(Exception):
    """Base exception for workspace operations."""
    pass


class WorkspacePathTraversalError(WorkspaceError):
    """Raised when a path traversal attempt is detected."""
    pass


class WorkspaceFileNotFoundError(WorkspaceError):
    """Raised when a requested workspace file does not exist."""
    pass


class AmbiguousInputMediaError(WorkspaceError):
    """Raised when multiple input.* media files exist in a single job workspace."""
    pass


class InvalidJobIdError(WorkspaceError):
    """Raised when a job ID violates syntax or length boundaries."""
    pass


class InvalidFilenameError(WorkspaceError):
    """Raised when a filename contains illegal characters or formatting."""
    pass


class JobWorkspace:
    """
    Manages sandboxed per-job storage in data/jobs/{jobId}/ for media and ML processing.
    Guarantees atomic file writes, UTF-8 encoding, and strict path boundary enforcement.
    """

    def __init__(self, job_id: str, base_dir: Optional[Path | str] = None):
        self._validate_job_id(job_id)
        self.job_id = job_id

        root = (
            Path(base_dir).resolve()
            if base_dir
            else settings.resolve_workspace_root()
        )
        self.workspace_root = root
        self.workspace_dir = (self.workspace_root / self.job_id).resolve()

        # Enforce containment within workspace_root
        root_prefix = str(self.workspace_root)
        if not root_prefix.endswith(os.sep):
            root_prefix += os.sep

        if not str(self.workspace_dir).startswith(root_prefix):
            raise WorkspacePathTraversalError(
                f"Job workspace escapes root storage: '{job_id}'"
            )

    @staticmethod
    def _validate_job_id(job_id: str) -> None:
        if not job_id or not isinstance(job_id, str):
            raise InvalidJobIdError("Job ID must be a non-empty string")

        if len(job_id) < MIN_JOB_ID_LENGTH or len(job_id) > MAX_JOB_ID_LENGTH:
            raise InvalidJobIdError(
                f"Job ID length must be between {MIN_JOB_ID_LENGTH} and {MAX_JOB_ID_LENGTH} characters (received: {len(job_id)})"
            )

        if ".." in job_id or "/" in job_id or "\\" in job_id or "\0" in job_id:
            raise WorkspacePathTraversalError("Job ID contains illegal traversal characters")

        if bool(re.match(r"^[a-zA-Z]:", job_id)):
            raise WorkspacePathTraversalError("Job ID contains Windows drive letter syntax")

        if not JOB_ID_REGEX.match(job_id):
            raise InvalidJobIdError(
                f"Job ID '{job_id}' does not match required pattern '^job_[a-zA-Z0-9_-]+$'"
            )

    @staticmethod
    def _validate_filename(filename: str) -> None:
        if not filename or not isinstance(filename, str):
            raise InvalidFilenameError("Filename must be a non-empty string")

        if (
            "\0" in filename
            or ".." in filename
            or "/" in filename
            or "\\" in filename
            or bool(re.match(r"^[a-zA-Z]:", filename))
        ):
            raise WorkspacePathTraversalError(f"Path traversal attempt in filename: '{filename}'")

        # Windows illegal filename characters: : * ? " < > |
        if bool(re.search(r'[:*?"<>|]', filename)) or filename == "." or filename.strip() != filename:
            raise InvalidFilenameError(f"Filename contains invalid characters or formatting: '{filename}'")

    def ensure_workspace(self) -> Path:
        """Ensures that the job workspace directory exists."""
        self.workspace_dir.mkdir(parents=True, exist_ok=True)
        return self.workspace_dir

    def get_path(self, filename: str) -> Path:
        """
        Returns the resolved Path for a file within this job's workspace.
        Enforces that the path remains strictly inside this specific job directory.
        """
        self._validate_filename(filename)
        resolved_file = (self.workspace_dir / filename).resolve()

        workspace_prefix = str(self.workspace_dir)
        if not workspace_prefix.endswith(os.sep):
            workspace_prefix += os.sep

        if not str(resolved_file).startswith(workspace_prefix):
            raise WorkspacePathTraversalError(
                f"File path escapes job workspace: '{filename}' in '{self.job_id}'"
            )

        return resolved_file

    def resolve_input_path(self) -> Optional[Path]:
        """
        Scans the workspace for uploaded input media (input.*).
        - 0 matches: returns None.
        - Exactly 1 match: returns the Path.
        - > 1 match: raises AmbiguousInputMediaError.
        Ignores dot-prefixed temporary files.
        """
        if not self.workspace_dir.exists():
            return None

        # Filter out dot-prefixed temporary files (e.g., .*.tmp)
        matches = [
            p for p in self.workspace_dir.glob("input.*")
            if p.is_file() and not p.name.startswith(".")
        ]

        if not matches:
            return None
        if len(matches) == 1:
            return matches[0]

        conflicts = [p.name for p in matches]
        raise AmbiguousInputMediaError(
            f"Multiple input media files found in job workspace '{self.job_id}': {conflicts}"
        )

    def get_input_path(self, extension: str) -> Path:
        """
        Returns the expected input file path for a validated extension.
        Sanitizes the extension to ensure it is alphanumeric with no traversal characters.
        """
        if not extension or not isinstance(extension, str):
            raise InvalidFilenameError("Extension must be a non-empty string")

        clean_ext = extension.lstrip(".")
        if not re.match(r"^[a-zA-Z0-9]+$", clean_ext):
            raise InvalidFilenameError(f"Invalid extension format: '{extension}'")

        return self.get_path(f"input.{clean_ext}")

    @property
    def audio_path(self) -> Path:
        return self.get_path(AUDIO_FILENAME)

    @property
    def words_path(self) -> Path:
        return self.get_path(WORDS_FILENAME)

    @property
    def segments_path(self) -> Path:
        return self.get_path(SEGMENTS_FILENAME)

    @property
    def translations_path(self) -> Path:
        return self.get_path(TRANSLATIONS_FILENAME)

    @property
    def output_srt_path(self) -> Path:
        return self.get_path(OUTPUT_SRT_FILENAME)

    def write_text(self, filename: str, content: str) -> Path:
        """
        Performs an atomic write of UTF-8 text via a dot-prefixed temporary file and rename.
        """
        self.ensure_workspace()
        target_path = self.get_path(filename)
        temp_path = self.workspace_dir / f".{filename}.{uuid.uuid4().hex}.tmp"

        try:
            with open(temp_path, "w", encoding="utf-8") as f:
                f.write(content)
                f.flush()
                os.fsync(f.fileno())
            os.replace(temp_path, target_path)
            return target_path
        except Exception:
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except Exception:
                    pass
            raise

    def write_json(self, filename: str, data: Any, indent: int = 2) -> Path:
        """
        Serializes data to JSON and atomically writes with UTF-8 encoding.
        """
        serialized = json.dumps(data, indent=indent, ensure_ascii=False)
        return self.write_text(filename, serialized)

    def read_text(self, filename: str) -> str:
        """
        Reads a text file with UTF-8 encoding.
        """
        target_path = self.get_path(filename)
        if not target_path.is_file():
            raise WorkspaceFileNotFoundError(
                f"File '{filename}' not found in workspace for job '{self.job_id}'"
            )

        with open(target_path, "r", encoding="utf-8") as f:
            return f.read()

    def read_json(self, filename: str) -> Any:
        """
        Reads and deserializes a JSON file.
        """
        content = self.read_text(filename)
        return json.loads(content)

    def delete_file(self, filename: str) -> bool:
        """
        Deletes a specific file primitive from the job workspace.
        """
        target_path = self.get_path(filename)
        if not target_path.is_file():
            raise WorkspaceFileNotFoundError(
                f"File '{filename}' not found in workspace for job '{self.job_id}'"
            )

        target_path.unlink()
        return True

    def cleanup(self) -> None:
        """
        Removes the entire job workspace directory and all its contents.
        """
        if self.workspace_dir.exists():
            shutil.rmtree(self.workspace_dir, ignore_errors=True)
