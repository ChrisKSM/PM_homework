#!/bin/sh
# ALM Admin 회신용 — HLM REST URL·PAT fingerprint·MR/PRD HTTP (토큰 값 미출력)
# BE pod (uvicorn + dej Variables):
#   sh scripts/collect-polarion-alm-evidence.sh
#   API_BASE=http://127.0.0.1:8000/api sh scripts/collect-polarion-alm-evidence.sh
set -u
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
API_BASE="${API_BASE:-http://127.0.0.1:8000/api}"
PY=".venv/bin/python"
[ -x venv/bin/python ] && PY="venv/bin/python"
[ -x "$PY" ] || PY="python3"

echo "=============================================="
echo " Polarion REST — ALM Admin 확인용 (값 노출 없음)"
echo "=============================================="
echo ""

echo "--- 1) BE 설정 (HLM customs v1) ---"
"$PY" <<'PY'
from config import settings
from dej_variables import dej_get, dej_sdk_variables_available, runtime_get, token_fingerprint, variables_get_length_detail


def resolve_polarion_pat() -> str:
    try:
        from polarion_client import polarion_pat

        t = (polarion_pat() or "").strip()
        if t:
            return t
    except ImportError:
        pass
    try:
        from polarion_client import _polarion_pat

        t = (_polarion_pat() or "").strip()
        if t:
            return t
    except ImportError:
        pass
    return (settings.polarion_pat or "").strip() or runtime_get("POLARION_PAT")


base = (settings.polarion_base_url or "").rstrip("/")
print("POLARION_BASE_URL (BE):", base)
print("MR project:", settings.polarion_project_key)
print("PRD project:", getattr(settings, "polarion_prd_project_key", ""))
print("PRD REST path:", getattr(settings, "polarion_prd_rest_list_path", "workitems"))
print("dej_sdk variables:", dej_sdk_variables_available())
pat = resolve_polarion_pat()
print("POLARION_PAT length:", len(pat))
print("POLARION_PAT fingerprint:", token_fingerprint(pat) if pat else "(empty)")
print("variables_get POLARION_PAT:", variables_get_length_detail("POLARION_PAT"))
env_len = len((dej_get("POLARION_PAT") or ""))
settings_len = len((settings.polarion_pat or "").strip())
if settings_len and env_len and settings_len != env_len:
    print("WARN: settings.polarion_pat len != variables.get len — stale .env 의심")
PY

echo ""
echo "--- 2) REST smoke (동일 PAT — diagnose-polarion-pat.sh 와 동일 URL) ---"
"$PY" <<'PY'
import asyncio
import httpx
from config import settings


def resolve_polarion_pat() -> str:
    try:
        from polarion_client import polarion_pat

        t = (polarion_pat() or "").strip()
        if t:
            return t
    except ImportError:
        pass
    try:
        from polarion_client import _polarion_pat

        t = (_polarion_pat() or "").strip()
        if t:
            return t
    except ImportError:
        pass
    from dej_variables import runtime_get

    return (settings.polarion_pat or "").strip() or runtime_get("POLARION_PAT")


def bearer_headers(pat: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {pat}", "Accept": "application/json"}


base = settings.polarion_base_url.rstrip("/")
pat = resolve_polarion_pat()
if not pat:
    print("NG  POLARION_PAT 비어 있음 — AxStudio Variables 또는 .env")
    raise SystemExit(1)

MR_HTTP = PRD_HTTP = 0


async def probe(label, project, path, query):
    global MR_HTTP, PRD_HTTP
    url = f"{base}/projects/{project}/{path.strip('/')}"
    async with httpx.AsyncClient(
        verify=settings.polarion_verify_ssl, timeout=60.0, headers=bearer_headers(pat)
    ) as client:
        from polarion_client import _list_query_params

        r = await client.get(url, params=_list_query_params(query, 1, 3))
    if "RelProj" in project or project == settings.polarion_project_key:
        MR_HTTP = r.status_code
    if "ReqMgmt" in project or project == getattr(settings, "polarion_prd_project_key", ""):
        PRD_HTTP = r.status_code
    print(f"{label}")
    print(f"  GET {url}")
    print(f"  query={query!r}")
    print(f"  HTTP {r.status_code}  bytes={len(r.text or '')}")
    if r.status_code != 200:
        try:
            d = r.json()
            for e in d.get("errors") or []:
                print(f"  error: {e.get('status')} {e.get('title')} — {e.get('detail')}")
        except Exception:
            print(f"  body: {(r.text or '')[:280]}")
    else:
        try:
            d = r.json()
            print(f"  OK keys: {list(d.keys())[:6]}")
        except Exception:
            print(f"  body: {(r.text or '')[:120]}")
    print("")


async def main():
    await probe(
        "MR (RelProj)",
        settings.polarion_project_key,
        getattr(settings, "polarion_list_path", "workitems"),
        "type:testDefect",
    )
    prd_proj = getattr(settings, "polarion_prd_project_key", "AVSWReqMgmt")
    prd_path = getattr(settings, "polarion_prd_rest_list_path", "workitems")
    await probe("PRD (ReqMgmt)", prd_proj, prd_path, "components:(H7_VI)")
    await probe(
        "PRD alt path (workitems/PRD)",
        prd_proj,
        "workitems/PRD",
        "components:(H7_VI)",
    )

asyncio.run(main())
PY

echo "--- 3) BE API (모델현황 PRD catalog probe) ---"
if curl -sf --max-time 120 "${API_BASE%/}/model-status/prd/query-catalog?model=H7_VI&max_queries=5" >/tmp/prd_cat.json 2>/dev/null; then
  "$PY" -m json.tool </tmp/prd_cat.json | head -45
else
  echo "  (skip — uvicorn 미기동 또는 ${API_BASE} unreachable)"
fi

echo ""
echo "--- 4) Polarion UI (ALM Admin 요청 — SSO) ---"
echo "  프로젝트: AVSWReqMgmt → Work Items → PRD"
echo "  URL: https://alm-lge-hlm.singlex.com/polarion/#/project/AVSWReqMgmt/workitems/PRD"
echo "  예: PRD AVRM-5373 등 목록·상세 조회 가능 (seokmin.koh SSO)"
echo ""
echo "--- 5) ALM Admin 회신 초안 (HTTP·UI 내용 반영 후 발송) ---"
cat <<'TXT'
안녕하세요, ALM Admin 님.

문의 주신 REST URL·토큰·PRD UI 확인 결과 공유드립니다.

1) REST Base URL (HLM)
   https://alm-lge-hlm.singlex.com/polarion/restful/customs/v1
   (다른 호스트/구 URL 사용하지 않습니다.)

2) 인증
   Polarion Personal Access Token 1개를 Authorization: Bearer 로 사용합니다.
   MR(AVSWRelProjMgmt)과 PRD(AVSWReqMgmt) REST에 동일 PAT를 사용하며,
   API별로 서로 다른 토큰을 쓰지 않았습니다.

3) REST 호출 결과 (BE pod, 동일 PAT)
   - GET .../projects/AVSWRelProjMgmt/workitems?query=type:testDefect  → HTTP 200
   - GET .../projects/AVSWReqMgmt/workitems?query=components:(H7_VI)  → HTTP 403
     오류: This account does not have [Administration] Access Permission.
   - GET .../projects/AVSWReqMgmt/workitems/PRD?query=...             → HTTP 403 (동일)

4) PRD Workitem UI (SSO, seokmin.koh)
   Polarion 웹에서 AVSWReqMgmt / PRD 목록·상세 조회 가능합니다.
   (예: PRD AVRM-5373 [Soundbar][webOS] Room Calibration Pro … 등)
   → UI SSO 로는 PRD 조회가 되나, 위 PAT 로 ReqMgmt customs REST 는 403 입니다.

Global REST 권한 설정하신 것과 별도로, PAT 발급 계정(seokmin.koh)에
AVSWReqMgmt 프로젝트 customs REST(workitems) 접근 권한이 필요한지
검토 부탁드립니다. (또는 UI 와 동일 권한이 REST PAT 에 매핑되도록 안내 부탁드립니다.)

감사합니다.
고석민
TXT
