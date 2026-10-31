#!/bin/sh
# shellcheck shell=sh
# BE FastAPI pod (/workspace/project with config.py + main.py). React/FE pod 에서 exit 1.
require_be_pod() {
  ROOT="${1:-/workspace/project}"
  if [ ! -d "$ROOT" ]; then
    echo "NG: directory missing: $ROOT"
    exit 1
  fi
  if [ ! -f "$ROOT/config.py" ] || [ ! -f "$ROOT/main.py" ]; then
    echo "NG: BE pod가 아닙니다 — config.py · main.py 필요 (hostname=$(hostname 2>/dev/null || echo '?'))."
    echo "    지금 경로: $ROOT"
    echo "    story-sp-kpi API는 **project-be-*** deployment pod 에서만 패치하세요."
    echo "    React pod(project-react-*) 는 FE 빌드만 — API는 BE 로 프록시됩니다."
    exit 1
  fi
}
