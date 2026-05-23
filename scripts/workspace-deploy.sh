#!/bin/sh
# 회사 workspace dev pod에서 FE+BE 반영 스크립트
# 사용법:
#   FE pod (/workspace/project — react-audio):
#     sh scripts/workspace-deploy.sh fe
#   BE pod (/workspace/project — be-audio-test):
#     sh scripts/workspace-deploy.sh be
#
# GitHub에서 최신 코드 받기 (pod에 git clone 되어 있다면):
#   git fetch origin webpack-migration && git checkout webpack-migration && git pull

set -e
MODE="${1:-all}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Jira Dashboard workspace deploy (mode=$MODE) ==="
echo "ROOT=$ROOT"

deploy_fe() {
  echo "[FE] npm install ..."
  npm install

  echo "[FE] .env 확인 (없으면 예시 생성)"
  if [ ! -f .env ]; then
    cat > .env <<'EOF'
REACT_APP_API_BASE_URL=
REACT_APP_USE_MOCK=false
EOF
    echo "  → .env 생성됨. workspace proxy 사용 시 REACT_APP_API_BASE_URL 비워두면 client.ts가 자동 유도"
  fi

  echo "[FE] webpack build (Docker/CI와 동일 — output: build/)"
  npm run build

  echo "[FE] 완료. dev: npm start  |  prod build: build/ 폴더"
  echo "[FE] /planning 페이지 → 사이드바 '계획 추적성'"
}

deploy_be() {
  echo "[BE] pip install ..."
  cd "$ROOT/backend"
  pip install -r requirements.txt -q

  echo "[BE] .env 확인"
  if [ ! -f .env ]; then
    cp .env.example .env
    echo "  → backend/.env 생성됨. JIRA_API_TOKEN 반드시 설정!"
  fi

  echo "[BE] planning API 엔드포인트:"
  echo "  GET /api/planning/compliance"
  echo "  GET /api/planning/hierarchy"
  echo "  GET /api/planning/traceability"
  echo "  GET /api/planning/stories/{key}"
  echo "  GET /api/planning/filters"

  echo "[BE] 실행: cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
  cd "$ROOT"
}

case "$MODE" in
  fe) deploy_fe ;;
  be) deploy_be ;;
  all)
    deploy_fe
    deploy_be
    ;;
  *)
    echo "Usage: $0 [fe|be|all]"
    exit 1
    ;;
esac

echo "=== Done ==="
