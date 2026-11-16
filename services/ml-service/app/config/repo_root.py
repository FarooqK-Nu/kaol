import json
from pathlib import Path


def find_monorepo_root(start_dir: Path | str | None = None) -> Path:
    """
    Dynamically resolves the monorepo root directory by traversing upward
    until a package.json containing a 'workspaces' field is encountered.
    """
    current = Path(start_dir).resolve() if start_dir else Path(__file__).resolve()

    while True:
        pkg_path = current / "package.json"
        if pkg_path.is_file():
            try:
                with open(pkg_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict) and "workspaces" in data:
                        return current
            except Exception:
                pass

        parent = current.parent
        if parent == current:
            raise RuntimeError(
                "Unable to locate monorepo root (package.json with 'workspaces' not found)"
            )
        current = parent
