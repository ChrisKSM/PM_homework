#!/bin/sh
# react-audio FE pod — 모델 검증 일정 상세 UI (월 보기·카테고리·gray·Snapshot diff)
# GitLab origin 에 cursor 브랜치 없을 때 GitHub raw 로 파일만 덮어씀.
#
#   cd /workspace/project
#   sh scripts/apply-model-schedule-verification-ui-fe.sh
#   npm run build
#   # GitLab push / 재배포
#
set -e
ROOT="${ROOT:-/workspace/project}"
cd "$ROOT"

# commit 전체 SHA 또는 브랜치명 (짧은 SHA 404 날 수 있음)
REF="${REF:-cursor/model-schedule-bar-label-fix-b14b}"
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"

mkdir -p src/pages src/api src/utils src/components/modelSchedule

fetch() {
  src="$1"
  dst="$2"
  curl -fsSL "$BASE/$src" -o "$dst"
  echo "  + $dst"
}

echo "=== Verification schedule UI from GitHub @ ${REF:0:7} ==="
fetch src/utils/modelScheduleMonth.ts src/utils/modelScheduleMonth.ts
fetch src/utils/modelScheduleDiff.ts src/utils/modelScheduleDiff.ts
fetch src/utils/modelScheduleRows.ts src/utils/modelScheduleRows.ts
fetch src/pages/ModelSchedulePage.tsx src/pages/ModelSchedulePage.tsx
fetch src/api/modelScheduleApi.ts src/api/modelScheduleApi.ts
fetch src/components/modelSchedule/ScheduleSnapshotDialog.tsx src/components/modelSchedule/ScheduleSnapshotDialog.tsx

echo ""
echo "=== 검증 (구 UI면 실패 — 9/22~11/2 슬라이딩 윈도우) ==="
grep -q 'daysInMonth' src/pages/ModelSchedulePage.tsx && echo "  OK  month view (daysInMonth)"
grep -q 'isModelGroupSettled' src/pages/ModelSchedulePage.tsx && echo "  OK  settled gray"
grep -q 'emailDiffBaseline' src/pages/ModelSchedulePage.tsx && echo "  OK  snapshot diff baseline"
grep -q 'schedule_changes' src/api/modelScheduleApi.ts && echo "  OK  shareSnapshot diff fields"

echo ""
echo "=== 다음: npm run build 후 배포 ==="
echo "  화면 확인: 상단 기간이 '10/1 ~ 10/31' 형식 (9/22 ~ 11/2 아님)"
echo "  subtitle: '월 단위(10/1~10/31)' 문구"
echo "=== Done ==="
