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

_pids_on_port() {
  _port="$1"
  _found=""
  if command -v ss >/dev/null 2>&1; then
    _found=$(ss -tlnp 2>/dev/null | grep ":${_port} " | sed -n 's/.*pid=\([0-9]*\).*/\1/p')
  fi
  if command -v netstat >/dev/null 2>&1; then
    _ns=$(netstat -tlnp 2>/dev/null | grep ":${_port} " | awk '{print $7}' | cut -d/ -f1 | grep -E '^[0-9]+$')
    _found=$(printf '%s\n%s' "$_found" "$_ns")
  fi
  if command -v fuser >/dev/null 2>&1; then
    _fu=$(fuser "${_port}/tcp" 2>/dev/null || true)
    _found=$(printf '%s\n%s' "$_found" "$_fu")
  fi
  if command -v lsof >/dev/null 2>&1; then
    _lo=$(lsof -t -i ":${_port}" -sTCP:LISTEN 2>/dev/null || true)
    _found=$(printf '%s\n%s' "$_found" "$_lo")
  fi
  echo "$_found" | tr ' ' '\n' | grep -E '^[0-9]+$' | sort -u
}

_show_port_listener() {
  _port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -tlnp 2>/dev/null | grep ":${_port} " || echo "  (port $_port free)"
  elif command -v netstat >/dev/null 2>&1; then
    netstat -tlnp 2>/dev/null | grep ":${_port} " || echo "  (port $_port free)"
  elif command -v fuser >/dev/null 2>&1; then
    fuser -v "${_port}/tcp" 2>&1 || echo "  (port $_port free)"
  else
    ps aux 2>/dev/null | grep -E '[u]vicorn|[p]ython.*main:app' || true
  fi
}

_kill_port_listeners() {
  _port="$1"
  if command -v pkill >/dev/null 2>&1; then
    pkill -f "uvicorn main:app" 2>/dev/null || true
    pkill -f "uvicorn.*--port ${_port}" 2>/dev/null || true
    sleep 1
  fi
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${_port}/tcp" 2>/dev/null || true
    sleep 1
  fi
  _i=1
  while [ "$_i" -le 5 ]; do
    _pids=$(_pids_on_port "$_port")
    if [ -z "$_pids" ]; then
      return 0
    fi
    echo "  stopping port ${_port} pid(s): $(echo "$_pids" | tr '\n' ' ')"
    for _pid in $_pids; do
      kill "$_pid" 2>/dev/null || true
    done
    sleep 2
    for _pid in $_pids; do
      kill -0 "$_pid" 2>/dev/null && kill -9 "$_pid" 2>/dev/null || true
    done
    sleep 1
    _i=$((_i + 1))
  done
}

_openapi_has_model_schedule() {
  curl -sf "http://127.0.0.1:${PORT}/openapi.json" 2>/dev/null | "$PY" -c "
import json, sys
d = json.load(sys.stdin)
ok = any('model-schedule' in p for p in d.get('paths', {}))
sys.exit(0 if ok else 1)
" >/dev/null 2>&1
}

echo "=== stop listeners on :$PORT ==="
_kill_port_listeners "$PORT"
_show_port_listener "$PORT"

_dej_ok() {
  "$1" -c "from dej_sdk import llm" >/dev/null 2>&1
}

_main_ok() {
  "$1" -c "import main" >/dev/null 2>&1
}

_model_schedule_ok() {
  "$1" -c "from routers import model_schedule" >/dev/null 2>&1
}

_ms_routes_on_app() {
  "$1" -c "
import main
paths = [
    getattr(r, 'path', '') or ''
    for r in main.app.routes
    if 'model-schedule' in (getattr(r, 'path', '') or '')
]
raise SystemExit(0 if paths else 1)
" >/dev/null 2>&1
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
  elif [ -f routers/model_schedule.py ] && _model_schedule_ok "$PY"; then
    echo "WARN dej_sdk missing on $PY — keep venv for model_schedule/overview (LLM → rule fallback)"
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

# overview: import alone is not enough — main.app must expose routes
if [ -f routers/model_schedule.py ] && ! _ms_routes_on_app "$PY"; then
  echo "WARN model-schedule routes missing on main.app ($PY) — trying venv/bin/python"
  if [ -x venv/bin/python ] && _main_ok venv/bin/python && _ms_routes_on_app venv/bin/python; then
    PY="venv/bin/python"
    echo "OK  model-schedule routes on $PY"
  fi
fi

echo "=== import main:app ==="
if ! "$PY" -c "import main" 2>/tmp/be-import.err; then
  echo "NG  import main failed:"
  head -20 /tmp/be-import.err
  exit 1
fi
echo "OK  import main"

if [ -f routers/model_schedule.py ] && ! _ms_routes_on_app "$PY"; then
  echo "NG  main.app has no /api/model-schedule routes (main.py 등록 누락)"
  echo "    sh scripts/patch-be-main-model-schedule.sh"
  grep -n model_schedule main.py 2>/dev/null | head -5 || true
  exit 1
fi

echo "=== uvicorn 0.0.0.0:$PORT ($PY) ==="
nohup "$PY" -m uvicorn main:app --host 0.0.0.0 --port "$PORT" >>"/tmp/uvicorn-${PORT}.log" 2>&1 &
UVPID=$!
echo "  pid $UVPID  log /tmp/uvicorn-${PORT}.log"
sleep 2
if ! kill -0 "$UVPID" 2>/dev/null; then
  echo "NG  uvicorn exited immediately (port in use or import error)"
  tail -25 "/tmp/uvicorn-${PORT}.log" 2>/dev/null || true
  _show_port_listener "$PORT"
  exit 1
fi

i=1
while [ "$i" -le 15 ]; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/health" 2>/dev/null || echo "000")
  if [ "$CODE" = "200" ]; then
    echo "OK  GET /health → 200"
    LISTEN_PID=$(_pids_on_port "$PORT" | head -1)
    echo "  listen pid: ${LISTEN_PID:-?} (expected $UVPID)"
    if [ -f routers/model_schedule.py ] && ! _openapi_has_model_schedule; then
      echo "NG  :${PORT} 응답에 model-schedule OpenAPI 없음 — 구 uvicorn/플랫폼 프로세스일 수 있음"
      echo "    sh scripts/kill-be-port-listener.sh && sh scripts/be-restart-uvicorn-standalone.sh"
      echo "    venv/bin/python -c \"import main; print([r.path for r in main.app.routes if 'model-schedule' in str(getattr(r,'path',''))][:3])\""
      curl -s "http://127.0.0.1:${PORT}/openapi.json" 2>/dev/null | "$PY" -c "
import json,sys
d=json.load(sys.stdin)
print('  openapi overview:', [p for p in d.get('paths',{}) if 'overview' in p][:5] or 'NONE')
" 2>/dev/null || true
      exit 1
    fi
    OVC=$(curl -s -o /dev/null -w "%{http_code}" \
      "http://127.0.0.1:${PORT}/api/model-schedule/overview/load" 2>/dev/null || echo "000")
    if [ "$OVC" = "200" ] || [ "$OVC" = "502" ]; then
      echo "OK  GET /api/model-schedule/overview/load → $OVC"
    elif [ "$OVC" = "404" ]; then
      echo "NG  GET /api/model-schedule/overview/load → 404 (listen pid ≠ venv uvicorn?)"
      _show_port_listener "$PORT"
      exit 1
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
