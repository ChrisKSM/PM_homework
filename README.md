# 🚀 Jira WBS Dashboard

**Jira Cloud 기반 Sprint WBS 시각화 + GPT-4o AI 리스크 분석 대시보드**

---

## 📋 프로젝트 구조

```
jira-wbs-dashboard/
├── backend/                    # FastAPI 백엔드
│   ├── main.py                 # FastAPI 앱 진입점
│   ├── requirements.txt        # Python 의존성
│   ├── .env.example            # 환경변수 템플릿
│   ├── routers/
│   │   ├── jira.py             # Jira API 라우터 (프로젝트/보드/스프린트)
│   │   ├── sprint.py           # WBS 트리 생성 라우터
│   │   └── analysis.py        # AI 분석 라우터
│   └── services/
│       ├── jira_service.py     # Jira Cloud REST API 연동
│       └── ai_service.py      # OpenAI GPT-4o 분석 서비스
│
├── frontend/                   # React + Vite + MUI 프론트엔드
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── theme/theme.js      # MUI 다크 테마
│   │   ├── services/api.js     # Axios API 클라이언트
│   │   ├── pages/
│   │   │   └── DashboardPage.jsx
│   │   └── components/
│   │       ├── common/
│   │       │   ├── Layout.jsx  # 사이드바 레이아웃
│   │       │   └── StatCard.jsx
│   │       ├── dashboard/
│   │       │   ├── SprintSelector.jsx  # 프로젝트/보드/스프린트 선택
│   │       │   └── DashboardCharts.jsx # Recharts 차트
│   │       ├── wbs/
│   │       │   └── WBSTree.jsx # 계층형 WBS 트리
│   │       └── risk/
│   │           └── RiskAnalysis.jsx    # AI 리스크 패널
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── start_backend.bat           # 백엔드 실행 스크립트 (Windows)
├── start_frontend.bat          # 프론트엔드 실행 스크립트 (Windows)
└── README.md
```

---

## ⚙️ 사전 요구사항

| 항목 | 버전 | 설치 링크 |
|------|------|-----------|
| Python | 3.10+ | https://python.org |
| Node.js | 18+ | https://nodejs.org |
| Jira Cloud 계정 | - | https://atlassian.com |
| OpenAI API Key | - | https://platform.openai.com |

---

## 🔑 Jira API Token 발급 방법

1. https://id.atlassian.com/manage-profile/security/api-tokens 접속
2. **Create API Token** 클릭
3. 토큰 이름 입력 후 생성
4. 생성된 토큰을 복사해서 `.env`에 붙여넣기

---

## 🚀 실행 방법

### 1단계: 환경변수 설정

```cmd
cd backend
copy .env.example .env
```

`.env` 파일을 열어 아래 내용 입력:

```env
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-jira-api-token

OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o
```

### 2단계: 백엔드 실행

```cmd
# 방법 1: 배치 파일 더블클릭
start_backend.bat

# 방법 2: 수동
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### 3단계: 프론트엔드 실행

```cmd
# 방법 1: 배치 파일 더블클릭
start_frontend.bat

# 방법 2: 수동
cd frontend
npm install
npm run dev
```

### 4단계: 브라우저 접속

- **대시보드**: http://localhost:5173
- **API 문서**: http://localhost:8000/docs

---

## 🎯 주요 기능

### 📊 Overview 탭
- Sprint 이슈 현황 (완료/진행중/할일)
- Story Point 달성률
- 담당자별 워크로드 분포
- 이슈 타입 / 우선순위 분포 차트

### 🌲 WBS Tree 탭
- **Epic → Story → Sub-task** 계층 구조 시각화
- 각 Epic별 하위 완료율 진행바
- 이슈 상태, 우선순위, 담당자, Story Point 한눈에 확인
- 이슈 검색 기능

### 🤖 AI Risk Analysis 탭 (GPT-4o)
- **Sprint Health Score** (0~100점 게이지)
- **리스크 자동 식별**: Schedule / Resource / Quality / Scope / Technical 카테고리
- 리스크별 심각도(Critical/High/Medium/Low), 발생확률, 영향 이슈, 완화 방안
- **Sprint 완료 예측 확률** (%)
- **우선 실행 권고사항** (AI 추천)
- 팀 워크로드 분석 및 병목 식별

---

## 🔧 API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/jira/projects` | Jira 프로젝트 목록 |
| GET | `/api/jira/boards/{project_key}` | 보드 목록 |
| GET | `/api/jira/sprints/{board_id}` | 스프린트 목록 |
| GET | `/api/sprint/{sprint_id}/wbs` | WBS 트리 + 통계 |
| POST | `/api/analysis/sprint-risks` | GPT-4o AI 리스크 분석 |

---

## 🎨 UI 특징

- **다크 미래형 테마** (Deep Navy + Cyan + Purple)
- **Framer Motion** 애니메이션
- **Recharts** 인터랙티브 차트 (도넛, 바, 레이더)
- **실시간 검색** WBS 트리 필터링
- **반응형** 레이아웃

---

## 🛠️ 커스터마이징

### Story Points 필드 커스텀
`backend/services/jira_service.py`의 `normalize_issue` 함수에서 `customfield_10016` 또는 `customfield_10028`을 Jira 인스턴스의 실제 커스텀 필드 ID로 교체:

```python
story_points = fields.get("customfield_XXXXX") or 0
```

Jira 관리자 → 프로젝트 설정 → 필드에서 Story Points의 Field ID 확인 가능.

---

## 📝 라이선스

MIT License
