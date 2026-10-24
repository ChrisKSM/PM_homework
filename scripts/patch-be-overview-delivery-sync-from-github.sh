#!/bin/sh
# BE pod — Delivery Portal → overview Mongo sync API (+ sync shell script)
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/ef5804c/scripts/patch-be-overview-delivery-sync-from-github.sh" | REF=ef5804c sh
#   REF=ef5804c sh scripts/patch-be-overview-delivery-sync-from-github.sh
#
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
REF="${REF:-ef5804c}"
exec sh scripts/fetch-delivery-portal-pod-scripts.sh 2>/dev/null || {
  BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"
  fetch() { mkdir -p "$(dirname "$2")"; curl -fsSL "$BASE/$1" -o "$2"; echo "  + $2"; }
  echo "=== overview delivery sync @ $REF (inline) ==="
  fetch scripts/fetch-delivery-portal-pod-scripts.sh scripts/fetch-delivery-portal-pod-scripts.sh
  REF="$REF" sh scripts/fetch-delivery-portal-pod-scripts.sh
}
