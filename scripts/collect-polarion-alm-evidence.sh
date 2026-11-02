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
from dej_variables import dej_get, dej_sdk_variables_available, token_fingerprint, variables_get_length_detail
from polarion_client import polarion_pat

base = (settings.polarion_base_url or "").rstrip("/")
print("POLARION_BASE_URL (BE):", base)
print("MR project:", settings.polarion_project_key)
print("PRD project:", getattr(settings, "polarion_prd_project_key", ""))
print("PRD REST path:", getattr(settings, "polarion_prd_rest_list_path", "workitems"))
print("dej_sdk variables:", dej_sdk_variables_available())
pat = polarion_pat()
print("POLARION_PAT length:", len(pat))
print("POLARION_PAT fingerprint:", token_fingerprint(pat) if pat else "(empty)")
print("variables_get POLARION_PAT:", variables_get_length_detail("POLARION_PAT"))
env_len = len((dej_get("POLARION_PAT") or ""))
settings_len = len((settings.polarion_pat or "").strip())
if settings_len and env_len and settings_len != env_len:
    print("WARN: settings.polarion_pat len != variables.get len — stale .env 의심")
PY

echo ""
echo "--- 2) REST smoke (BE polarion_client 와 동일 PAT) ---"
"$PY" <<'PY'
import asyncio
import json
import httpx
from config import settings
from polarion_client import polarion_pat, _headers

base = settings.polarion_base_url.rstrip("/")
pat = polarion_pat()
if not pat:
    print("NG  POLARION_PAT 비어 있음 — AxStudio Variables POLARION_PAT 확인")
    raise SystemExit(1)

async def probe(label, project, path, query):
    url = f"{base}/projects/{project}/{path.strip('/')}"
    async with httpx.AsyncClient(
        verify=settings.polarion_verify_ssl, timeout=60.0, headers=_headers()
    ) as client:
        r = await client.get(url, params={"query": query, "page": 1, "pageSize": 3})
    preview = (r.text or "")[:280]
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
            print(f"  body: {preview}")
    else:
        try:
            d = r.json()
            print(f"  OK keys: {list(d.keys())[:6]}")
        except Exception:
            print(f"  body: {preview[:120]}")
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

asyncio.run(main())
PY

echo "--- 3) BE API (모델현황 PRD catalog probe) ---"
if curl -sf --max-time 3 "${API_BASE%/}/model-status/prd/query-catalog?model=H7_VI&max_queries=5" >/tmp/prd_cat.json 2>/dev/null; then
  "$PY" -m json.tool </tmp/prd_cat.json | head -45
else
  echo "  (skip — uvicorn 미기동 또는 ${API_BASE} unreachable)"
fi

echo ""
echo "--- 4) Polarion UI (수동 확인 — ALM Admin 요청) ---"
echo "  PRD 프로젝트: AVSWReqMgmt"
echo "  UI base: https://alm-lge-hlm.singlex.com/polarion/#/project/AVSWReqMgmt/workitems/PRD"
echo "  확인: PRD Workitem 조회 / (가능하면) 수정·생성 — SSO 계정으로"
echo ""
echo "--- 5) ALM Admin 회신 요약 (복붙) ---"
cat <<'TXT'
안녕하세요,

REST 호출은 HLM Polarion customs v1 URL을 사용하고 있습니다.
  Base: https://alm-lge-hlm.singlex.com/polarion/restful/customs/v1
  인증: Authorization: Bearer &lt;Polarion Personal Access Token&gt; (단일 PAT, MR/PRD 동일)

확인 결과(위 스크립트 HTTP):
  - AVSWRelProjMgmt (MR) workitems REST: (스크립트 출력 HTTP 참고)
  - AVSWReqMgmt (PRD) workitems REST: (스크립트 출력 HTTP 참고)

토큰을 서로 다르게 쓰지 않았으며, URL도 HLM(alm-lge-hlm.singlex.com)으로 호출 중입니다.
PRD Workitem UI(조회/수정/생성)는 Polarion 웹에서 SSO로 (별도) 확인하겠습니다.

MR 200 / PRD 403(Administration Access Permission)인 경우,
Global REST 권한 외 AVSWReqMgmt customs API 프로젝트 접근이 PAT 계정에 필요한지
검토 부탁드립니다.

감사합니다.
TXT
