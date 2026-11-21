#!/bin/sh
# FE pod — 과제: Initiative 워크벤치 (/initiative, 사이드바 맨 아래 '과제')
#   생성 자동화 · 필수 필드 가이드 · Owner 조직 선택 · Due/Release Sprint sync · PO/ELT 리뷰 가이드 (UI only, mock)
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/initiative-workbench-724f/scripts/patch-fe-initiative-workbench-from-github.sh" | sh
#
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
REF="${REF:-cursor/initiative-workbench-724f}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

if [ ! -f package.json ] || [ ! -d src/pages ]; then
  echo "ERROR: FE pod 아님 — package.json / src/pages 필요 (cwd=$(pwd))" >&2
  exit 1
fi

fetch() {
  mkdir -p "$(dirname "$1")"
  curl -fsSL -H "Cache-Control: no-cache" "${BASE}/$1" -o "$1"
  echo "  + $1"
}

echo "=== FE Initiative 워크벤치 @ ${REF} ==="
fetch src/App.tsx
fetch src/components/layout/Sidebar.tsx
fetch src/pages/InitiativeWorkbenchPage.tsx
fetch src/data/initiativeTemplate.ts
fetch src/data/initiativeOrg.ts
fetch src/utils/initiativeSprint.ts
fetch src/utils/initiativeValidation.ts
fetch src/utils/initiativeAutofill.ts
fetch src/utils/initiativePayload.ts
fetch src/components/initiative/InitiativeFieldShell.tsx
fetch src/components/initiative/InitiativeOwnerPicker.tsx
fetch src/components/initiative/InitiativeCreateForm.tsx
fetch src/components/initiative/InitiativeAssistantPanel.tsx
fetch src/components/initiative/InitiativeReviewGuide.tsx
fetch src/components/initiative/InitiativeClonePanel.tsx
fetch src/components/initiative/InitiativeCreateDialog.tsx
fetch scripts/patch-fe-initiative-workbench-from-github.sh

grep -q 'path="initiative"' src/App.tsx && echo "  OK  route /initiative"
grep -q "TASK_NAV" src/components/layout/Sidebar.tsx && echo "  OK  사이드바 맨 아래 '과제'"
grep -q "OrgMemberBrowser" src/components/initiative/InitiativeOwnerPicker.tsx && echo "  OK  Owner/PO 조직(팀·파트) 선택"
grep -q "'scopeOfChange'" src/data/initiativeTemplate.ts && echo "  OK  Scope of Change 임시 키"

if [ "${RUN_BUILD:-1}" = "1" ] && command -v npm >/dev/null 2>&1; then
  echo ""
  echo "=== npm run build ==="
  npm run build
else
  echo "  build 생략 — npm run build"
fi
echo "=== Done — /initiative 새로고침 (사이드바 맨 아래 '과제 › Initiative 워크벤치') ==="
