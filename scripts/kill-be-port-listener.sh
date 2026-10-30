#!/bin/sh
# BE pod — :8000 (또는 BE_ROUTE_PORT) 리스너 종료 (ss 없는 이미지 대응)
#
#   sh scripts/kill-be-port-listener.sh
#   PORT=8000 sh scripts/kill-be-port-listener.sh
#
set -e
cd /workspace/project 2>/dev/null || cd "$(dirname "$0")/.." || exit 1
PORT="${BE_ROUTE_PORT:-8000}"

_pids_on_port() {
  _port="$1"
  _found=""
  if command -v ss >/dev/null 2>&1; then
    _found=$(ss -tlnp 2>/dev/null | grep ":${_port} " | sed -n 's/.*pid=\([0-9]*\).*/\1/p')
  fi
  if [ -z "$_found" ] && command -v netstat >/dev/null 2>&1; then
    _found=$(netstat -tlnp 2>/dev/null | grep ":${_port} " | awk '{print $7}' | cut -d/ -f1 | grep -E '^[0-9]+$')
  fi
  if [ -z "$_found" ] && command -v fuser >/dev/null 2>&1; then
    _found=$(fuser "${_port}/tcp" 2>/dev/null || true)
  fi
  if [ -z "$_found" ] && command -v lsof >/dev/null 2>&1; then
    _found=$(lsof -t -i ":${_port}" -sTCP:LISTEN 2>/dev/null || true)
  fi
  echo "$_found" | tr ' ' '\n' | grep -E '^[0-9]+$' | sort -u
}

_show() {
  echo "=== port $PORT before kill ==="
  if command -v ss >/dev/null 2>&1; then
    ss -tlnp 2>/dev/null | grep ":${PORT} " || echo "  (not listening)"
  elif command -v netstat >/dev/null 2>&1; then
    netstat -tlnp 2>/dev/null | grep ":${PORT} " || echo "  (not listening)"
  elif command -v fuser >/dev/null 2>&1; then
    fuser -v "${PORT}/tcp" 2>&1 || echo "  (not listening)"
  else
    ps aux 2>/dev/null | grep -E '[u]vicorn|[p]ython.*main:app' || echo "  (ps — install netstat/fuser for port→pid)"
  fi
}

_show

if command -v pkill >/dev/null 2>&1; then
  pkill -f "uvicorn main:app" 2>/dev/null || true
  pkill -f "uvicorn.*--port ${PORT}" 2>/dev/null || true
  sleep 1
fi

if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" 2>/dev/null || true
  sleep 1
fi

_i=1
while [ "$_i" -le 5 ]; do
  _pids=$(_pids_on_port "$PORT")
  if [ -z "$_pids" ]; then
    break
  fi
  echo "  kill pid(s): $(echo "$_pids" | tr '\n' ' ')"
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

echo "=== port $PORT after kill ==="
_show
echo "OK  done — sh scripts/be-restart-uvicorn-standalone.sh"
