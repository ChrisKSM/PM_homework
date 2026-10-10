# AX Studio — 본인 BE Pod만 쓸 때 (공용 be-audio-test-dpl 수정 불가)

## 왜 브라우저만 Initiative가 실패했나

| 구성요소 | URL / Pod | Initiative |
|----------|-----------|------------|
| **본인 BE** (할당 Pod) | `project-be-audio-test-seokmin-koh-…` / Worker URL | `.env` TVJIRA OK, `curl localhost` OK |
| **공용 BE** (Route) | `be-audio-test.apps.axstudio.lge.com` → `be-audio-test-dpl-*` | TVJIRA 없음 — **수정 권한 없으면 손대지 않음** |

FE(`react-audio.apps.axstudio.lge.com`) 기본값은 **공용 BE** (`src/api/client.ts`의 `BE_AXSTUDIO`).

본인 Pod만 고치면 **localhost 검증은 되고**, 브라우저는 **공용 BE**를 치므로 실패합니다.

## 해결: FE가 본인 Worker BE URL을 보도록

1. AX Studio에서 본인 BE **Worker Port URL** 확인 (예시):

   `https://be-audio-test--8000--seokmin-koh.apps.axstudio.lge.com`

2. **FE Pod**에서:

   ```bash
   BE_WORKER_URL=https://be-audio-test--8000--<본인계정>.apps.axstudio.lge.com \
     sh scripts/patch-fe-be-worker-url.sh
   npm run build
   # 배포 절차에 맞게 push / redeploy
   ```

3. 브라우저 Network 탭에서 API가  
   `…--seokmin-koh…/api/model-status/initiatives` 로 나가는지 확인.

`REACT_APP_API_BASE_URL` / `workspace_env.js` override는 `client.ts`에서 **공용 URL보다 우선** 적용됩니다.

## 공용 Pod에 TVJIRA 넣으라는 말은 언제 해당?

팀 **운영 FE**가 계속 `be-audio-test.apps.axstudio.lge.com`만 쓸 때, **인프라 담당**이 `be-audio-test-dpl` Variables/`.env`를 맞추는 경우입니다.

개발자가 **할당 BE Pod만** 운영하면 **Worker URL 연결이 정석**입니다.
