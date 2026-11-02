# ALM Admin — Polarion REST / PRD Workitem 회신 가이드

Admin 안내 요약:

- REST API 권한은 **Global** — 권한 있는 프로젝트에서 호출 가능
- **토큰을 다르게 썼는지**, **HLM URL**로 호출했는지 확인 요청
- **PRD Workitem** UI에서 수정/생성/조회 가능한지 확인 요청

## 우리 BE가 쓰는 값 (HLM)

| 항목 | 값 |
|------|-----|
| REST Base | `https://alm-lge-hlm.singlex.com/polarion/restful/customs/v1` |
| MR 목록 | `GET .../projects/AVSWRelProjMgmt/workitems?query=...` |
| PRD 목록 | `GET .../projects/AVSWReqMgmt/workitems?query=...` |
| 인증 | `Authorization: Bearer <POLARION_PAT>` — **MR·PRD 동일 PAT 1개** (Jira처럼 Variables `POLARION_PAT`) |
| UI (PRD) | `https://alm-lge-hlm.singlex.com/polarion/#/project/AVSWReqMgmt/workitems/PRD` |

다른 ALM 호스트/구 URL 로 부르지 **않음**.

## Pod 증거 수집 (토큰 값 출력 없음)

구버전 `polarion_client.py`( `polarion_pat` 없음) pod 도 스크립트가 `resolve_polarion_pat()` 폴백으로 동작합니다.

```bash
cd /workspace/project
# uvicorn 기동 후
sh scripts/collect-polarion-alm-evidence.sh
```

또는 `.env` PAT 로 직접 curl (Variables 와 len 이 다르면 BE 와 불일치):

```bash
set -a && . ./.env && set +a
sh scripts/diagnose-polarion-pat.sh
```

BE Variables 와 동일 PAT 로 보려면 **collect-polarion-alm-evidence.sh** (Python `polarion_pat()`).

## 해석

| MR HTTP | PRD HTTP | 의미 |
|---------|----------|------|
| 200 | 200 | REST OK — FE/쿼리 이슈만 남음 |
| 200 | 403 Administration | PAT 유효, **AVSWReqMgmt REST/customs** 거부 (Global REST ≠ ReqMgmt 프로젝트) |
| 403 | 403 | PAT 종류/만료 또는 잘못된 JWT |
| 401 | — | PAT 만료·오타·Variables ≠ pod .env |

## UI 확인 (Admin 요청 — 스크린샷용)

1. 브라우저 SSO 로 `alm-lge-hlm.singlex.com` Polarion 로그인
2. **AVSWReqMgmt** → **PRD** workitem 목록 열기
3. PRD 1건 **조회** → (권한 있으면) **수정** / **생성** 시도
4. 결과를 Admin 에게: “UI 조회 O/X, 수정 O/X, 생성 O/X” + 사용 계정 ID

UI는 되는데 REST 403 이면 **SSO 계정 역할 ≠ PAT 발급 계정** 인 경우가 많음 → PAT 를 UI 와 **동일 사용자**로 재발급 요청.

## AxStudio Variables

- 키: **`POLARION_PAT`** (Polarion User Settings → Personal Access Token)
- `.env` stale PAT 제거 후 Publish (Jira PAT 와 동일 패턴)
