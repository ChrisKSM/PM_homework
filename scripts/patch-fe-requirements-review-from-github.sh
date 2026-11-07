#!/bin/sh
# FE pod — 요구사항 검토 (PRD API) + 사이드 메뉴 정리
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/patch-fe-requirements-review-from-github.sh" | sh
#
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

if [ ! -f package.json ] || [ ! -d src/pages ]; then
  echo "ERROR: FE pod 아님 — package.json / src/pages 필요 (cwd=$(pwd))" >&2
  exit 1
fi

fetch() {
  mkdir -p "$(dirname "$2")"
  curl -fsSL "$BASE/$1" -o "$2"
  echo "  + $2"
}

echo "=== FE requirements-review + nav @ $REF ==="
fetch src/store/dashboardStore.ts src/store/dashboardStore.ts
fetch src/App.tsx src/App.tsx
fetch src/pages/RequirementsReviewPage.tsx src/pages/RequirementsReviewPage.tsx
fetch src/hooks/useRequirementsReviewPrd.ts src/hooks/useRequirementsReviewPrd.ts
fetch src/utils/requirementsReviewFromPrd.ts src/utils/requirementsReviewFromPrd.ts
fetch src/types/requirementsReview.ts src/types/requirementsReview.ts
fetch src/data/requirementsReviewMock.ts src/data/requirementsReviewMock.ts
fetch src/utils/requirementsReviewAuth.ts src/utils/requirementsReviewAuth.ts
fetch src/components/requirementsReview/RequirementsReviewFilters.tsx src/components/requirementsReview/RequirementsReviewFilters.tsx
fetch src/components/requirementsReview/RequirementsReviewTable.tsx src/components/requirementsReview/RequirementsReviewTable.tsx
fetch src/components/requirementsReview/RequirementsReviewEditDrawer.tsx src/components/requirementsReview/RequirementsReviewEditDrawer.tsx
fetch src/api/modelStatusApi.ts src/api/modelStatusApi.ts
fetch src/types/modelStatusPrd.ts src/types/modelStatusPrd.ts
fetch scripts/patch-fe-be-shared-url.sh scripts/patch-fe-be-shared-url.sh
fetch scripts/patch-fe-requirements-review-from-github.sh scripts/patch-fe-requirements-review-from-github.sh
chmod +x scripts/patch-fe-be-shared-url.sh 2>/dev/null || true

grep -q requirements-review src/store/dashboardStore.ts && echo "  OK  sidebar: 요구사항 검토"
if grep -q '모델 검증 일정 상세' src/store/dashboardStore.ts 2>/dev/null; then
  echo "  WARN  검증 일정 메뉴 아직 있음 — dashboardStore 확인"
else
  echo "  OK  검증 일정 메뉴 제거됨"
fi
grep -q useRequirementsReviewPrd src/pages/RequirementsReviewPage.tsx && echo "  OK  PRD API 연동"

REQ_FILES="
src/types/requirementsReview.ts
src/data/requirementsReviewMock.ts
src/utils/requirementsReviewAuth.ts
src/components/requirementsReview/RequirementsReviewTable.tsx
src/components/requirementsReview/RequirementsReviewEditDrawer.tsx
"
MISS=0
for f in $REQ_FILES; do
  if [ -f "$f" ]; then
    echo "  OK  $f"
  else
    echo "  NG  $f missing"
    MISS=1
  fi
done
[ "$MISS" -eq 0 ] || { echo "ERROR: 요구사항 검토 번들 파일 누락 — fetch 실패 또는 REF 확인" >&2; exit 1; }

echo ""
echo "=== FE API → be-audio-test ==="
RUN_BUILD=0 sh scripts/patch-fe-be-shared-url.sh

if [ "${RUN_BUILD:-1}" = "1" ] && command -v npm >/dev/null 2>&1; then
  echo ""
  echo "=== npm run build ==="
  npm run build
else
  echo "  build 생략 — RUN_BUILD=1 npm run build"
fi

echo ""
echo "  확인: /model-schedule/requirements-review · H7_VI 선택"
echo "=== patch-fe-requirements-review done ==="
