# Jira Dashboard

LGE Jira Server 기반 프로젝트 관리 대시보드 — 조직 책임자 및 개발팀 내부 분석용

## 프로젝트 구조

```
PM_homework/
├── frontend/          # React 18 + TypeScript + Vite 프론트엔드
└── backend/           # Python FastAPI 백엔드 (LGE Jira Server 연동)
```

---

## Frontend

### 기술 스택

| 항목 | 내용 |
|---|---|
| 프레임워크 | React 18 + TypeScript |
| 빌드 도구 | Vite 5 |
| 스타일 | Tailwind CSS (다크 테마) |
| 차트 | Recharts |
| 데이터 페칭 | TanStack React Query |
| 상태 관리 | Zustand |
| 라우팅 | React Router v6 |

### 대시보드 구성

**조직 책임자 Dashboard** (`/manager`)
- KPI 요약 카드 (전체 진행률, 완료 Epic/Story, 블로커 수)
- Epic별 진행률 (100% 누적 스택 바 차트)
- 이슈 상태 분포 (도넛 차트)
- 스프린트 Velocity 추이 (라인 차트)
- 주요 리스크 및 블로커 테이블

**개발팀 내부 Dashboard** (`/devteam`)
- 스프린트 KPI (남은 SP, 완료율, 블로커, D-day)
- Burn Down Chart (이상적 vs 실제)
- 팀원별 Story Points 분배 (수평 바 차트)
- 스프린트 Velocity 비교 (누적 바 차트)
- 현재 스프린트 이슈 상세 테이블

### 실행 방법

```powershell
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

### 환경 변수 (`frontend/.env`)

`frontend/.env.example`을 복사해서 `.env` 파일 생성:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_USE_MOCK=true   # false로 변경 시 실제 Backend API 연동
```

---

## Backend

### 기술 스택

| 항목 | 내용 |
|---|---|
| 프레임워크 | Python FastAPI |
| HTTP 클라이언트 | httpx (비동기) |
| 인증 방식 | PAT Bearer Token (Jira Server) |
| Jira API | REST API v2 + Agile API v1.0 |
| 캐시 | 메모리 TTL 캐시 (5분) |
| 데이터 검증 | Pydantic v2 |

### API 엔드포인트

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/metrics/summary` | 전체 KPI (진행률, Epic/Story 완료, 블로커) |
| GET | `/api/epics/progress` | Epic별 완료/진행중/미시작 SP |
| GET | `/api/issues/distribution` | 상태별 이슈 분포 |
| GET | `/api/sprints/velocity` | 최근 7스프린트 계획 vs 완료 |
| GET | `/api/issues/risks` | Blocked/고우선순위 리스크 이슈 |
| GET | `/api/sprints/current/summary` | 현재 스프린트 KPI |
| GET | `/api/sprints/current/burndown` | 번다운 차트 데이터 |
| GET | `/api/sprints/{id}/burndown` | 특정 스프린트 번다운 |
| GET | `/api/team/workload` | 팀원별 담당 SP 분배 |
| GET | `/api/issues/current-sprint` | 현재 스프린트 이슈 목록 |

### 실행 방법

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

- **Swagger UI**: `http://localhost:8000/docs`
- **헬스체크**: `http://localhost:8000/health`

### 환경 변수 (`backend/.env`)

`backend/.env.example`을 복사해서 `.env` 파일 생성:

```env
JIRA_BASE_URL=https://harmony.lge.com:8443/issue
JIRA_API_TOKEN=your_pat_token_here
JIRA_VERIFY_SSL=false

BOARD_ID=12641

# LGE Jira Server 커스텀 필드 ID
STORY_POINTS_FIELD=customfield_10808
EPIC_NAME_FIELD=customfield_10804
EPIC_LINK_FIELD=customfield_10801
SPRINT_FIELD=customfield_10800
RELEASE_SPRINT_FIELD=customfield_18834
CHIP_NAME_FIELD=customfield_14922
```

---

## 전체 실행 (동시 실행)

터미널 1 — Backend:
```powershell
cd backend
.\venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

터미널 2 — Frontend:
```powershell
cd frontend
npm run dev
```

브라우저에서 `http://localhost:3000` 접속
