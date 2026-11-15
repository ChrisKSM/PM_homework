#!/bin/sh
# BE pod — Delivery Portal → overview Mongo sync API (+ sync shell script)
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/02508b2/scripts/patch-be-overview-delivery-sync-from-github.sh" | REF=02508b2 sh
#   REF=02508b2 sh scripts/patch-be-overview-delivery-sync-from-github.sh
#
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
REF="${REF:-02508b2}"
exec sh scripts/fetch-delivery-portal-pod-scripts.sh 2>/dev/null || {
  BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"
  fetch() { mkdir -p "$(dirname "$2")"; curl -fsSL "$BASE/$1" -o "$2"; echo "  + $2"; }
  echo "=== overview delivery sync @ $REF (inline) ==="
  fetch scripts/fetch-delivery-portal-pod-scripts.sh scripts/fetch-delivery-portal-pod-scripts.sh
  REF="$REF" sh scripts/fetch-delivery-portal-pod-scripts.sh
}
