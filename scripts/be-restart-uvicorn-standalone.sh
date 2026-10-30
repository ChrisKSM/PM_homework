#!/bin/sh
# BE pod only — pod-detect.sh 없이 uvicorn 8000 기동 (Worker URL 503 해소)
#
#   curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/cursor/model-schedule-bar-label-fix-b14b/scripts/be-restart-uvicorn-standalone.sh" | sh
#
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1

if [ ! -f main.py ] || [ ! -d routers ]; then
  echo "NG: BE pod /workspace/project (main.py + routers/) 에서 실행하세요"
  exit 1
fi

PORT="${BE_ROUTE_PORT:-8000}"

if [ -f .env ]; then
  mkdir -p /usr/app/src 2>/dev/null || true
  cp .env /usr/app/src/.env 2>/dev/null || true
  echo "OK  .env copied (if path exists)"
fi

# stop old listener on PORT (best effort)
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" 2>/dev/null || true
  sleep 1
fi

_dej_ok() {
  "$1" -c "from dej_sdk import llm" >/dev/null 2>&1
}

_main_ok() {
  "$1" -c "import main" >/dev/null 2>&1
}

_model_schedule_ok() {
  "$1" -c "from routers import model_schedule" >/dev/null 2>&1
}

_llm_wanted() {
  if [ -f .env ] && grep -qE '^LLM_ENABLED=(1|true|yes|on|TRUE|True)' .env 2>/dev/null; then
    return 0
  fi
  return 1
}

_pick_python() {
  want_ms=0
  [ -f routers/model_schedule.py ] && want_ms=1

  for candidate in venv/bin/python python3 python /usr/bin/python3; do
    [ -n "$candidate" ] || continue
    [ -x "$candidate" ] || command -v "$candidate" >/dev/null 2>&1 || continue
    _main_ok "$candidate" || continue
    if [ "$want_ms" -eq 1 ] && ! _model_schedule_ok "$candidate"; then
      continue
    fi
    echo "$candidate"
    return 0
  done

  for candidate in venv/bin/python python3 python /usr/bin/python3; do
    [ -n "$candidate" ] || continue
    [ -x "$candidate" ] || command -v "$candidate" >/dev/null 2>&1 || continue
    _main_ok "$candidate" || continue
    echo "$candidate"
    return 0
  done
  return 1
}

PY="$(_pick_python)" || true
if [ -z "$PY" ]; then
  echo "NG: python with import main required (venv/bin/python or python3)"
  exit 1
fi

if [ -f routers/model_schedule.py ] && _model_schedule_ok "$PY"; then
  echo "OK  model_schedule import on $PY"
elif [ -f routers/model_schedule.py ]; then
  echo "WARN model_schedule.py present but import failed on $PY (overview → 404)"
fi

if _llm_wanted; then
  if _dej_ok "$PY"; then
    echo "OK  LLM_ENABLED — dej_sdk on $PY"
  else
    echo "WARN dej_sdk missing on $PY — trying alternate interpreters"
    for candidate in python3 python /usr/bin/python3 venv/bin/python; do
      [ "$candidate" = "$PY" ] && continue
      [ -x "$candidate" ] || command -v "$candidate" >/dev/null 2>&1 || continue
      _main_ok "$candidate" || continue
      _dej_ok "$candidate" || continue
      if [ -f routers/model_schedule.py ] && ! _model_schedule_ok "$candidate"; then
        echo "  skip $candidate (dej_sdk OK but model_schedule/pymilvus missing)"
        continue
      fi
      echo "OK  using $candidate (dej_sdk available)"
      PY="$candidate"
      break
    done
    if ! _dej_ok "$PY"; then
      echo "WARN dej_sdk still missing — sprint report will use source=rule only"
    fi
  fi
fi

echo "=== import main:app ==="
if ! "$PY" -c "import main" 2>/tmp/be-import.err; then
  echo "NG  import main failed:"
  head -20 /tmp/be-import.err
  exit 1
fi
echo "OK  import main"

echo "=== uvicorn 0.0.0.0:$PORT ==="
nohup "$PY" -m uvicorn main:app --host 0.0.0.0 --port "$PORT" >>"/tmp/uvicorn-${PORT}.log" 2>&1 &
echo "  pid $!  log /tmp/uvicorn-${PORT}.log"

i=1
while [ "$i" -le 15 ]; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/health" 2>/dev/null || echo "000")
  if [ "$CODE" = "200" ]; then
    echo "OK  GET /health → 200"
    OVC=$(curl -s -o /dev/null -w "%{http_code}" \
      "http://127.0.0.1:${PORT}/api/model-schedule/overview/load" 2>/dev/null || echo "000")
    if [ "$OVC" = "200" ] || [ "$OVC" = "502" ]; then
      echo "OK  GET /api/model-schedule/overview/load → $OVC"
    elif [ "$OVC" = "404" ]; then
      echo "WARN GET /api/model-schedule/overview/load → 404 (BE 기동 OK, overview 라우터 없음)"
      echo "     uvicorn python: $PY — venv에 pymilvus·model_schedule import 확인"
      echo "     curl -fsSL \".../patch-be-overview-from-github.sh\" | sh"
    else
      echo "     GET /api/model-schedule/overview/load → $OVC"
    fi
    exit 0
  fi
  sleep 1
  i=$((i + 1))
done

echo "NG  /health still not 200 — tail /tmp/uvicorn-${PORT}.log"
tail -30 "/tmp/uvicorn-${PORT}.log" 2>/dev/null || true
exit 1
