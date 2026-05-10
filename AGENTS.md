# AGENTS.md

## Cursor Cloud specific instructions

### Project Overview

Jira WBS Dashboard — a FastAPI backend + React/Vite frontend for Sprint WBS visualization and GPT-4o AI risk analysis on Jira Cloud data. See `README.md` for full feature details and API endpoints.

### Running Services

| Service | Command | Port | Working Dir |
|---------|---------|------|-------------|
| Backend | `python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload` | 8000 | `backend/` |
| Frontend | `npm run dev` | 5173 | `frontend/` |

### Gotchas

- Use `python3` not `python` — this environment does not have a `python` symlink.
- The backend requires a `backend/.env` file. Copy from `backend/.env.example` if it doesn't exist. The app starts fine with placeholder values; Jira/OpenAI API calls will fail without real credentials but the server itself runs.
- The frontend proxies `/api` requests to `http://localhost:8000` via Vite config — start the backend first or in parallel.
- No linter or test framework is configured in this repository. There are no ESLint, Prettier, pytest, or similar configs.
- No database or Docker infrastructure is needed — all data comes from external Jira Cloud API.

### Build

- Frontend build: `cd frontend && npm run build` (output in `frontend/dist/`)

### Environment Variables (backend/.env)

Required for Jira features: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`
Optional for AI analysis tab: `OPENAI_API_KEY`, `OPENAI_MODEL`
