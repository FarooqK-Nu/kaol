import re
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from .repo_root import find_monorepo_root

REPO_ROOT = find_monorepo_root()


class Settings(BaseSettings):
    ml_host: str = "127.0.0.1"
    ml_port: int = 8000
    workspace_dir: str = "data/jobs"

    model_config = SettingsConfigDict(
        env_file=str(REPO_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def resolve_workspace_root(self, custom_workspace: str | Path | None = None) -> Path:
        target = str(custom_workspace or self.workspace_dir)
        path_obj = Path(target)
        if path_obj.is_absolute():
            return path_obj.resolve()

        # Strip any leading directory climbs if set relative to services/ml-service in legacy .env
        cleaned_rel = re.sub(r"^(\.\.[/\\])+", "", target)
        return (REPO_ROOT / cleaned_rel).resolve()


settings = Settings()
