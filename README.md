# Arabic to English Subtitle Generator (Kaol)

A high-accuracy web application that converts Arabic audio and video media into natural, properly synchronized English `.srt` subtitles.

## Architecture

- **Frontend (`apps/web`)**: React + TypeScript + Vite + Tailwind CSS.
- **Backend API (`apps/api`)**: Node.js + Express + TypeScript + Bun + Drizzle ORM.
- **ML Service (`services/ml-service`)**: Python 3.11 + FastAPI (`faster-whisper`, `whisperx`, OPUS-MT).
- **Shared Contracts (`packages/shared-types`)**: Canonical TypeScript types.
- **Infrastructure**: PostgreSQL 16 & Redis 7 via Docker Compose.

---

## Prerequisites

1. **Bun**: v1.4.0+
2. **Python**: v3.11
3. **Docker Desktop**: v29.0+ (with WSL 2 backend)

---

## Getting Started

### 1. Verify Environment
Run the pre-flight verification script:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-env.ps1
```

### 2. Start Infrastructure Containers
```powershell
docker compose up -d
```

### 3. Install Workspace Dependencies
```powershell
bun install
```

### 4. Run Development Servers
- **Backend API**:
  ```powershell
  bun run dev:api
  ```
  Runs at `http://localhost:3000`.

- **Frontend Web**:
  ```powershell
  bun run dev:web
  ```
  Runs at `http://localhost:5173`.

- **Python ML Service**:
  ```powershell
  bun run dev:ml
  ```
  Runs at `http://localhost:8000`.

---

## Validation Commands

- **Typecheck across monorepo**:
  ```powershell
  bun run typecheck
  ```
- **Lint across monorepo**:
  ```powershell
  bun run lint
  ```
- **Build all workspaces**:
  ```powershell
  bun run build
  ```
- **Run tests**:
  ```powershell
  bun run test
  ```
