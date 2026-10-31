#!/bin/sh
# 모델현황 BE+FE 패치 안내 (각 pod에서 해당 스크립트만 실행)
#
# BE (project-be-audio-test):
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/patch-be-model-status-prd-from-github.sh" | sh
#
# FE (react-audio / project frontend):
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/patch-fe-model-status-prd-from-github.sh" | sh
#
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
echo "=== Model status patch (REF=$REF) ==="
echo ""
echo "BE pod (/workspace/project, main.py):"
echo "  curl -fsSL \"https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}/scripts/patch-be-model-status-prd-from-github.sh\" | REF=${REF} sh"
echo ""
echo "FE pod (/workspace/project, package.json):"
echo "  curl -fsSL \"https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}/scripts/patch-fe-model-status-prd-from-github.sh\" | REF=${REF} sh"
echo ""
echo "FE API가 Worker(--8000--)로 나가면 (503):"
echo "  curl -fsSL \"https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}/scripts/patch-fe-be-shared-url.sh\" | sh"
echo ""
echo "Polarion 403 진단 (BE, .env PAT):"
echo "  set -a && . ./.env && set +a && sh scripts/diagnose-polarion-pat.sh"
echo ""
