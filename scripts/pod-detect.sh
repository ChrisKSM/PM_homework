#!/bin/sh
# FE(react-audio) vs BE(be-audio-test flat) pod 구분
# - FE: package.json + src/ (backend/ 서브폴더 있어도 FE)
# - BE: 루트 main.py + routers/ (package.json 없음)

is_fe_project() {
  # React FE
  if [ -f package.json ] && [ -d src ]; then
    return 0
  fi
  # monorepo: src + backend/, 루트 flat BE 없음
  if [ -d src ] && [ -d backend ] && [ ! -f main.py ] && [ ! -d routers ]; then
    return 0
  fi
  if [ -d src ] && [ -f backend/main.py ] && [ ! -f main.py ]; then
    return 0
  fi
  return 1
}

is_be_project() {
  if is_fe_project; then
    return 1
  fi
  if [ -f main.py ] && [ -d routers ]; then
    return 0
  fi
  if [ -f /workspace/project/main.py ] && [ -d /workspace/project/routers ] && [ ! -f /workspace/project/package.json ]; then
    return 0
  fi
  return 1
}

require_be_project() {
  if is_fe_project; then
    echo "Error: FE pod(react-audio) — BE 스크립트 실행 불가" >&2
    echo "  hostname: $(hostname 2>/dev/null || echo unknown)" >&2
    echo "  → sh scripts/apply-model-schedule-dev-recipients-fe.sh" >&2
    echo "  → BE 실수 반영 정리: sh scripts/cleanup-be-from-fe.sh" >&2
    echo "  → BE 배포: project-be-audio-test-* pod" >&2
    exit 1
  fi
  if ! is_be_project; then
    echo "Error: BE project not found (루트 main.py + routers/ 필요)" >&2
    echo "  → project-be-audio-test-* pod /workspace/project" >&2
    exit 1
  fi
}

require_fe_project() {
  if is_be_project; then
    echo "Error: BE pod — FE 스크립트 실행 불가" >&2
    echo "  → sh scripts/apply-model-schedule-dev-recipients-be.sh" >&2
    exit 1
  fi
  if ! is_fe_project; then
    echo "Error: FE project not found (package.json + src/ 필요)" >&2
    exit 1
  fi
}

be_project_root() {
  require_be_project
  if [ -f main.py ] && [ -d routers ]; then
    pwd
    return 0
  fi
  if [ -f /workspace/project/main.py ] && [ -d /workspace/project/routers ]; then
    echo /workspace/project
    return 0
  fi
  echo "Error: BE root resolve failed" >&2
  exit 1
}
