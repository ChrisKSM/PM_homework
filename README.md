# Jira Dashboard

Jira Cloud 기반 프로젝트 관리 대시보드 — 조직 책임자 및 개발팀 내부 분석용

## 프로젝트 구조

```
PM_homework/
├── frontend/          # React + TypeScript + Vite 프론트엔드
└── backend/           # Python FastAPI 백엔드 (예정)
```

## Frontend 기술 스택

| 항목 | 내용 |
|---|---|
| 프레임워크 | React 18 + TypeScript |
| 빌드 도구 | Vite 5 |
| 스타일 | Tailwind CSS |
| 차트 | Recharts |
| 데이터 페칭 | TanStack React Query |
| 상태 관리 | Zustand |
| 라우팅 | React Router v6 |

## 대시보드 구성

### 조직 책임자 Dashboard (`/manager`)
- KPI 요약 카드 (전체 진행률, 완료 Epic/Story, 블로커 수)
- Epic별 진행률 (100% 누적 스택 바 차트)
- 이슈 상태 분포 (도넛 차트)
- 스프린트 Velocity 추이 (라인 차트)
- 주요 리스크 및 블로커 테이블

### 개발팀 내부 Dashboard (`/devteam`)
- 스프린트 KPI (남은 SP, 완료율, 블로커, D-day)
- Burn Down Chart (이상적 vs 실제)
- 팀원별 Story Points 분배 (수평 바 차트)
- 스프린트 Velocity 비교 (누적 바 차트)
- 현재 스프린트 이슈 상세 테이블

## 실행 방법

```powershell
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

### 환경 변수 설정

`frontend/.env.example`을 복사해서 `.env` 파일 생성:

```
VITE_API_BASE_URL=http://localhost:8000/api
VITE_USE_MOCK=true   # false로 변경 시 실제 백엔드 API 연동
```

## Backend (예정)

Python FastAPI 기반 백엔드 — Jira REST API v3 연동
