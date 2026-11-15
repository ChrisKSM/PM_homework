# ALM Admin — Polarion REST / PRD Workitem 회신 가이드

Admin 안내 (2026-11):

- **customs v1** (`/polarion/restful/customs/v1`) 는 **project_admin** 권한 필요 — 일반 PAT 로는 403
- **OOTB REST v1** 사용 권장

## BE 기본 설정 (OOTB)

| 항목 | 값 |
|------|-----|
| REST Base | `https://alm-lge-hlm.singlex.com/polarion/rest/v1` |
| PRD 목록 | `GET .../projects/AVSWReqMgmt/workitems?query=components:(H7_VI)&page[number]=1&page[size]=10` |
| MR 목록 | `GET .../projects/AVSWRelProjMgmt/workitems?query=type:testDefect` |
| 인증 | `Authorization: Bearer <POLARION_PAT>` |
| UI (PRD) | `https://alm-lge-hlm.singlex.com/polarion/#/project/AVSWReqMgmt/workitems/PRD` |

예시 (Admin 제공):

```text
https://alm-lge-hlm.singlex.com/polarion/rest/v1/projects/AVSWReqMgmt/workitems?query=components:(H7_VI)
```

## Pod / Variables

```env
POLARION_BASE_URL=https://alm-lge-hlm.singlex.com/polarion/rest/v1
POLARION_PRD_PROJECT_KEY=AVSWReqMgmt
POLARION_PRD_REST_LIST_PATH=workitems
POLARION_PAT=<Personal Access Token>
```

구 customs 로 돌아가야 하면 `POLARION_BASE_URL` 만 `.../restful/customs/v1` 로 설정 (project_admin 필요).

## 진단

```bash
cd /workspace/project
set -a && . ./.env && set +a
sh scripts/diagnose-polarion-pat.sh
sh scripts/probe-polarion-prd-rest.sh
curl -s "http://127.0.0.1:8000/api/model-status/prd?model=H7_VI" | python3 -m json.tool | head -30
```

## Admin 회신 초안

> 확인 감사합니다.  
> customs v1 대신 안내해 주신 **OOTB REST v1** (`/polarion/rest/v1/projects/AVSWReqMgmt/workitems`) 로 BE·진단 스크립트를 변경했습니다.  
> `query=components:(H7_VI)` 형태로 PAT Bearer 호출 시 **HTTP 200·totalCount 확인** 후 공유드리겠습니다.  
> UI(SSO)에서 AVSWReqMgmt PRD 조회/수정은 별도로 [가능/불가] 확인했습니다.
