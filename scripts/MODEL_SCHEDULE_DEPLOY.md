# 모델 현황 — FE / BE pod 반영 가이드

GitHub `webpack-migration` 브랜치에서 회사 pod로 **FE·BE 각각** 가져와 쓰는 방법입니다.

> **FE pod**: react-audio (`/workspace/project`) — Webpack 빌드 후 GitLab CI 재배포  
> **BE pod**: be-audio-test (`/workspace/project`) — flat 구조 (`routers/`, `services/`, `main.py`)

---

## FE pod (react-audio)

```bash
cd /workspace/project
git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
git fetch github webpack-migration

# 방법 A — 스크립트 (권장)
sh scripts/apply-model-schedule-fe-only.sh github/webpack-migration

# 방법 B — 수동 checkout
git checkout github/webpack-migration -- \
  src/App.tsx \
  src/store/dashboardStore.ts \
  src/pages/ModelSchedulePage.tsx \
  src/api/modelScheduleApi.ts

npm install
npm run build
git add -A && git commit -m "feat: 모델 현황 v7 — 저장/로드 수정" && git push origin master
```

### FE 반영 파일

| 파일 | 설명 |
|------|------|
| `src/App.tsx` | `/model-schedule` 라우트 |
| `src/store/dashboardStore.ts` | 모델 현황 프로젝트 메뉴 |
| `src/pages/ModelSchedulePage.tsx` | Gantt 일정 + 편집 UI |
| `src/api/modelScheduleApi.ts` | MongoDB load/save + localStorage 폴백 |

### FE에서 건드리지 않는 파일

`src/api/client.ts` · `.env` · `Dockerfile` · `.gitlab-ci.yml`

---

## BE pod (be-audio-test)

```bash
cd /workspace/project
git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
git fetch github webpack-migration

# 방법 A — 스크립트 (권장)
sh scripts/add-model-schedule-be-only.sh github/webpack-migration

# 방법 B — 수동 checkout + flat 복사
git checkout github/webpack-migration -- \
  backend/services/mongo_helper.py \
  backend/routers/model_schedule.py \
  scripts/patch-be-main-model-schedule.sh

cp backend/services/mongo_helper.py services/mongo_helper.py
cp backend/routers/model_schedule.py routers/model_schedule.py
sh scripts/patch-be-main-model-schedule.sh
```

### BE `.env` 추가 (최초 1회)

```env
MONGO_API_BASE=https://delivery-portal-db-watcher.apps.hedej.lge.com
MONGO_API_TOKEN=<your_token>
```

### BE 반영 후 확인

```bash
# uvicorn 재시작 후
curl -s http://127.0.0.1:8000/api/model-schedule/load
curl -s -X POST http://127.0.0.1:8000/api/model-schedule/save \
  -H "Content-Type: application/json" \
  -d '{"rows":[]}'
```

### BE에서 건드리지 않는 파일

`config.py` · `jira_client.py` · `jira_service.py` · `.env` 기존 값

---

## 동작 요약

| 단계 | FE | BE |
|------|----|----|
| 페이지 진입 | `/api/model-schedule/load` 호출 → 없으면 localStorage → 없으면 mock | MongoDB에서 rows 반환 |
| 편집 완료 | `/api/model-schedule/save` + localStorage 저장 | MongoDB 전체 교체 저장 |
| 서버 실패 시 | localStorage에 저장, 재진입 시 복원 | 502 반환 (FE가 localStorage 폴백) |
