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

**탭/UI만 추가해도 동일:** pod에서 `npm run build`만 하면 `build/` 폴더만 바뀌고,  
브라우저 URL이 가리키는 **Route/Deployment** 가 그 이미지를 받아야 합니다.

### 공용 URL vs 본인 FE pod (4탭만 보일 때)

`https://react-audio.apps.axstudio.lge.com` 은 **팀 공용 FE** 일 수 있습니다.  
본인 workspace pod(`project-react-audio-<계정>-deployment`)에서 빌드·태그 push 해도 **공용 URL은 구번들**을 계속 줄 수 있습니다.

```bash
FE="https://react-audio.apps.axstudio.lge.com"
echo "pod BV: $(cat build/build-version.txt)"
curl -s "$FE/build-version.txt"
curl -s "$FE/index.html" | grep -oE 'main\.[a-f0-9]+\.js'
ls build/main.*.js
```

| 항목 | pod (로컬 build) | 공용 URL | 의미 |
|------|------------------|----------|------|
| build-version | `1791637397702` (예) | `1791617237091` (예) | **다른 배포본** |
| main.js | `main.7b44750a....js` | `main.e59a548e....js` | 브라우저는 **Last-Modified 07:27** 구 JS |

**조치:** AxStudio 워크스페이스에 표시된 **본인 react-audio Route URL** 로 `/model-schedule/status` 접속.  
공용 URL을 꼭 써야 하면 해당 Route를 가리키는 **팀 Deployment/CI** 에 반영 요청.

Worker URL에서 **`Invalid Host header`** → `webpack.config.js` `devServer.allowedHosts`에  
`.apps.axstudio.lge.com` 포함 후 `npm start` 재시작 (GitHub `webpack-migration` / `cursor/model-schedule-bar-label-fix-b14b` 반영).

```bash
sh scripts/verify-model-status-release-fe-deployed.sh   # 릴리즈 · Epic 탭
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

### Snapshot 메일 공유 포함 (권장 — 최신)

```bash
cd /workspace/project
git remote add github https://github.com/ChrisKSM/PM_homework.git 2>/dev/null || true
git fetch github cursor/model-schedule-bar-label-fix-b14b

# ⚠️ scripts/ 가 pod에 없으면 먼저 checkout (최초 1회)
git checkout github/cursor/model-schedule-bar-label-fix-b14b -- \
  scripts/deploy-model-schedule-share-be.sh

sh scripts/deploy-model-schedule-share-be.sh
# .env MONGO_PASSWORD 확인 후 uvicorn 재시작
```

**`.env` SMTP (Audio DL, 무인증):**

```env
SMTP_HOST=lgesmtp.lge.com
SMTP_PORT=25
SMTP_FROM=DL-webOS_PMO-AudioSWPO@lge.com
SMTP_USE_TLS=true
SMTP_VERIFY_SSL=false
MODEL_SCHEDULE_SHARE_RECIPIENTS=seokmin.koh@lge.com
```

### Milvus load/save 만 (구버전)

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

> **포트:** BE pod / Route 표준은 **8000**.  
> **중요:** pod 이름이 `project-be-audio-test-<사용자>-deployment` 이면 **개인 workspace pod** 입니다.  
> FE(`react-audio`)가 치는 `https://be-audio-test.apps.axstudio.lge.com` 은 **공용 Route** — local8000 OK + external 502 이면 **다른 Deployment** 문제입니다.

```bash
# uvicorn 재시작 후 (port 8000)
for p in 8000; do curl -sf "http://127.0.0.1:${p}/health" && BE=$p && break; done
curl -s "http://127.0.0.1:${BE}/api/model-schedule/load"
curl -s -X POST "http://127.0.0.1:${BE}/api/model-schedule/save" \
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
