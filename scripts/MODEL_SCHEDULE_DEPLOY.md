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
# ⚠️ scripts/ 가 pod에 없으면 먼저 checkout (최초 1회)
git checkout github/webpack-migration -- \
  scripts/add-model-schedule-be-only.sh \
  scripts/patch-be-main-model-schedule.sh
sh scripts/add-model-schedule-be-only.sh github/webpack-migration

# 방법 B — 수동 checkout + flat 복사 (스크립트 없을 때)
git checkout github/webpack-migration -- \
  backend/services/mongo_helper.py \
  backend/routers/model_schedule.py \
  scripts/patch-be-main-model-schedule.sh

cp backend/services/mongo_helper.py services/mongo_helper.py
cp backend/routers/model_schedule.py routers/model_schedule.py
sh scripts/patch-be-main-model-schedule.sh
```

### BE `.env` 추가 (Milvus — pymilvus)

```env
MONGO_HOST=dify-mv-audiojdmtask-milvus.milvus.svc
MONGO_PORT=19530
MONGO_USER=dify-mv-audiojdmtask-admin
MONGO_PASSWORD=<비밀번호>
MONGO_DB=dify_mv_audiojdmtask
```

> `*.milvus.svc` 호스트는 **Milvus**(19530)입니다. MongoDB(27017)가 아닙니다.  
> Milvus DB명은 **하이픈(-) 불가** — `dify-mv-audiojdmtask` → `dify_mv_audiojdmtask` (코드에서 자동 변환)

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

## 트러블슈팅

### MongoDB 저장 실패 — 연결 진단

```bash
pip install "setuptools>=69.0.0,<82" "pymilvus>=2.5.0"
sh scripts/verify-model-schedule-mongo.sh
curl -s http://127.0.0.1:8000/api/model-schedule/diagnose | python3 -m json.tool
```

| 증상 | 확인 |
|------|------|
| connection refused on 27017 | Milvus 서비스 — **`MONGO_PORT=19530`** |
| connection refused on 19530 | Milvus pod/서비스 상태 확인 |
| Authentication failed | `MONGO_USER` / `MONGO_PASSWORD` |
| 502 on load/save | uvicorn 재시작, pymongo 설치 여부 |

---

### `ERR_CONNECTION_REFUSED` / `localhost:8000/api/model-schedule/load`

FE가 BE에 연결하지 못할 때 발생합니다.

**1) FE 최신 반영 확인** (localStorage 폴백 + 저장 메시지)

```bash
sh scripts/apply-model-schedule-fe-only.sh github/webpack-migration
npm run build
```

**2) BE API URL 확인**

| FE 실행 환경 | BE URL |
|-------------|--------|
| react-audio (배포) | `https://be-audio-test.apps.hedej.lge.com/api` (자동) |
| workspace dev | proxy 또는 be-audio-test (자동) |
| localhost `npm run dev` | `.env`에 명시 필요 |

localhost에서 dev server 실행 시 `.env`:

```env
REACT_APP_API_BASE_URL=https://be-audio-test.apps.hedej.lge.com/api
```

**3) BE pod에 model_schedule 배포 + 재시작**

```bash
sh scripts/add-model-schedule-be-only.sh github/webpack-migration
# .env MONGO_API_TOKEN 설정 후 uvicorn 재시작
curl -s https://be-audio-test.apps.hedej.lge.com/api/model-schedule/load
```

**4) BE 없이 테스트**

최신 FE는 서버 실패 시 **localStorage**에 저장합니다. 콘솔에 Network Error가 보여도 편집 완료 후 **"브라우저에 저장됨"** 메시지가 뜨면 정상입니다.

---

## 동작 요약

| 단계 | FE | BE |
|------|----|----|
| 페이지 진입 | `/api/model-schedule/load` 호출 → 없으면 localStorage → 없으면 mock | MongoDB에서 rows 반환 |
| 편집 완료 | `/api/model-schedule/save` + localStorage 저장 | MongoDB 전체 교체 저장 |
| 서버 실패 시 | localStorage에 저장, 재진입 시 복원 | 502 반환 (FE가 localStorage 폴백) |
