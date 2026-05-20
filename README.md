# Jira Dashboard

LGE Jira Server 기반 프로젝트 관리 대시보드 — 조직 책임자 및 개발팀 내부 분석용

> **빌드 도구**: ~~Vite~~ → **Webpack 5 + Babel** (회사 리버스 프록시 환경 호환)

---

## 프로젝트 구조

```
├── src/                        ← React 18 + TypeScript 프론트엔드
│   ├── pages/
│   │   ├── ManagerDashboard.tsx    (조직 책임자 대시보드)
│   │   └── DevTeamDashboard.tsx    (개발팀 내부 대시보드)
│   ├── components/
│   │   ├── charts/             (Recharts 기반 차트)
│   │   ├── cards/              (KPI 카드, 테이블)
│   │   └── layout/             (Sidebar, Header, Layout)
│   ├── api/                    (Axios 클라이언트 + Jira API)
│   ├── hooks/                  (React Query 기반 데이터 훅)
│   ├── store/                  (Zustand 전역 상태)
│   ├── mocks/                  (목업 데이터)
│   └── types/                  (TypeScript 타입 정의)
│
├── backend/                    ← Python FastAPI 백엔드
│   ├── main.py
│   ├── config.py
│   ├── jira_client.py
│   ├── cache.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── DAILY_REPORT.md         (일일 리포트 설계 문서)
│   ├── templates/
│   │   └── daily_report.html   (HTML 이메일 템플릿)
│   ├── scripts/
│   │   └── send_daily_report.py
│   ├── k8s/
│   │   └── cronjob-daily-report.yaml
│   ├── routers/
│   │   ├── manager.py          (책임자 대시보드 API)
│   │   ├── devteam.py          (개발팀 대시보드 API)
│   │   └── report.py           (리포트 미리보기/발송 API)
│   └── services/
│       ├── jira_service.py     (Jira 비즈니스 로직)
│       ├── report_service.py   (리포트 데이터 수집)
│       └── email_service.py    (SMTP 발송)
│
├── public/
│   ├── index.html
│   ├── favicon.svg
│   └── workspace_env.js        (Docker 런타임 환경변수 — 자동 생성됨)
│
├── webpack.config.js           ← 빌드 설정
├── babel.config.json
├── tsconfig.json
├── tailwind.config.js
├── package.json
├── dev.cmd                     ← Windows PowerShell 제한 환경용 실행 스크립트
└── .env                        ← 로컬 환경변수 (git 제외)
```

---

## 처음 시작하기 (클론 후 최초 설정)

### 1. 저장소 클론

```powershell
git clone https://github.com/ChrisKSM/PM_homework.git
cd PM_homework
git checkout webpack-migration
```

### 2. 환경변수 파일 생성

루트에 `.env` 파일 생성:

```env
REACT_APP_API_BASE_URL=http://localhost:8000/api
REACT_APP_USE_MOCK=true
```

백엔드 환경변수 파일 생성:

```powershell
copy backend\.env.example backend\.env
```

`backend/.env` 열어서 Jira 연결 정보 입력:

```env
JIRA_BASE_URL=https://harmony.lge.com:8443/issue
JIRA_API_TOKEN=your_pat_token
JIRA_VERIFY_SSL=false
BOARD_ID=12641
```

### 3. 의존성 설치

```powershell
npm.cmd install
```

---

## 실행 방법

### Frontend 개발 서버

> PowerShell에서 `npm`이 막혀 있는 경우 `npm.cmd` 또는 `dev.cmd` 사용

```powershell
# 방법 A — PowerShell (회사 환경)
npm.cmd run dev

# 방법 B — 배치 파일 더블클릭
dev.cmd

# 방법 C — cmd 터미널에서
npm run dev
```

브라우저: **http://localhost:3000**

### Backend API 서버 (별도 터미널)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Swagger UI: **http://localhost:8000/docs**

### 프로덕션 빌드

```powershell
npm.cmd run build
# 결과물: build/ 폴더
```

---

## 대시보드 구성

| 경로 | 대상 | 주요 위젯 |
|------|------|-----------|
| `/manager` | 조직 책임자 | Epic 진행률, 이슈 상태 분포, Velocity 추이, 리스크 테이블 |
| `/devteam` | 개발팀 | Burn Down Chart, 팀원별 SP 분배, 스프린트 이슈 목록 |

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| 프레임워크 | React 18 + TypeScript |
| 빌드 도구 | Webpack 5 + Babel |
| 스타일 | Tailwind CSS (LG 화이트 + 레드 테마) |
| 차트 | Recharts |
| 데이터 페칭 | TanStack React Query v5 |
| 상태 관리 | Zustand |
| 라우팅 | React Router v6 |
| HTTP 클라이언트 | Axios |
| 백엔드 | Python FastAPI |

---

## Daily Report (매일 이메일 스냅샷)

매일 **평일 오전 8시(KST)** 에 책임자·개발팀 대시보드 현황을 HTML 이메일로 발송합니다.

### 수신자

- `seokmin.koh@lge.com`

### 발송 스케줄

- **08:00 KST**, 월~금 (`0 8 * * 1-5`, `Asia/Seoul`)
- K8s CronJob: `backend/k8s/cronjob-daily-report.yaml`

### 리포트 포함 섹션

**조직 책임자 대시보드**
- KPI 4종 (전체 진행률, Epic, Story, 블로커)
- Epic 진행률 Top 5
- 이슈 상태 분포
- Velocity 최근 3스프린트
- 리스크/블로커 Top 5

**개발팀 대시보드**
- 스프린트 KPI (이름, D-day, 완료율, 블로커)
- Burndown 요약
- 팀원별 워크로드 Top 5

### 환경 변수 (`backend/.env`)

```env
REPORT_ENABLED=true
REPORT_RECIPIENTS=seokmin.koh@lge.com
REPORT_SUBJECT_PREFIX=[Jira Dashboard]
REPORT_DASHBOARD_URL=https://workspace.hedej.lge.com/your-app

SMTP_HOST=smtp.lge.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@lge.com
SMTP_USE_TLS=true
```

### 로컬 테스트

```powershell
cd backend
pip install -r requirements.txt

# HTML만 생성 (메일 발송 X)
python scripts/send_daily_report.py --dry-run --output report.html

# 브라우저 미리보기 (uvicorn 실행 중)
# http://localhost:8000/api/report/preview

# 즉시 발송 (SMTP 설정 필요)
python scripts/send_daily_report.py
```

### 수동 API 발송

```powershell
curl -X POST http://localhost:8000/api/report/send -H "X-Report-Key: your-key"
```

상세 설계: [`backend/DAILY_REPORT.md`](backend/DAILY_REPORT.md)

---

## GitLab(사내) 이식 가이드

사내 GitLab(`mod.lge.com`) 환경에 배포할 때 교체할 파일 목록:

### 교체 대상

| 파일/폴더 | 비고 |
|-----------|------|
| `src/` 전체 | 기존 CRA JS → TypeScript로 교체 |
| `public/index.html` | workspace_env.js 로드 포함 |
| `public/workspace_env.js` | 빈 파일 (런타임에 자동 생성) |
| `package.json` | webpack 기반으로 교체 |

### 새로 추가할 파일

`webpack.config.js` / `babel.config.json` / `tsconfig.json` / `tailwind.config.js` / `postcss.config.js`

### 유지할 파일 (절대 수정 금지)

| 파일 | 이유 |
|------|------|
| `Dockerfile` | `npm run build` → `build/` 폴더 — 호환됨 |
| `.gitlab-ci.yml` | CI/CD 파이프라인 — 변경 불필요 |
| `settings/default.conf` | nginx 설정 — 그대로 사용 |
| `settings/entrypoint.sh` | 런타임 env 주입 — 그대로 사용 |

### 환경변수 (Docker/K8s)

`entrypoint.sh`가 `REACT_APP_` 접두사 환경변수를 자동으로 `window.workspace_env`에 주입합니다.

```
REACT_APP_API_BASE_URL=https://your-api-server/api
REACT_APP_USE_MOCK=false
```
