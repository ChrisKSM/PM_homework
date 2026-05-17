# Jira Dashboard — 프로젝트 루트

LGE Jira Server 기반 프로젝트 관리 대시보드 (조직 책임자 + 개발팀 내부용)

## 프로젝트 구조

```
jira_dashboard_frontend/    ← 현재 Cursor 워크스페이스
├── backend/                ← Python FastAPI 백엔드
│   ├── main.py
│   ├── config.py
│   ├── jira_client.py
│   ├── cache.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── routers/
│   │   ├── manager.py      (책임자 대시보드 API)
│   │   └── devteam.py      (개발팀 대시보드 API)
│   └── services/
│       └── jira_service.py (Jira 비즈니스 로직)
│
├── src/                    ← React + TypeScript 프론트엔드
│   ├── pages/
│   │   ├── ManagerDashboard.tsx
│   │   └── DevTeamDashboard.tsx
│   ├── components/
│   │   ├── charts/
│   │   ├── cards/
│   │   └── layout/
│   ├── hooks/useJiraData.ts
│   ├── api/
│   └── mocks/              (목업 데이터)
│
├── package.json
├── vite.config.ts
└── .env
```

## 실행 방법

### Backend (새 터미널)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API 문서: http://localhost:8000/docs

### Frontend (새 터미널)

```powershell
npm install
npm run dev
```

대시보드: http://localhost:3000

## 환경 변수 설정

### Backend — `backend/.env`

```env
JIRA_BASE_URL=https://harmony.lge.com:8443/issue
JIRA_API_TOKEN=your_pat_token
JIRA_VERIFY_SSL=false
BOARD_ID=12641
```

### Frontend — `.env`

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_USE_MOCK=false    # false = 실제 Jira 연동, true = 목업 데이터
```
