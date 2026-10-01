#!/bin/sh
# react-audio pod — client.ts workspace dev 시 localhost:8000 대신 be-audio-test 사용
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f src/api/client.ts ]; then
  echo "Error: src/api/client.ts not found"
  exit 1
fi

python3 - <<'PY' 2>/dev/null || python - <<'PY'
from pathlib import Path

p = Path("src/api/client.ts")
t = p.read_text(encoding="utf-8")

needle = "return PROD_API_BASE_URL"
block = """    // workspace dev — proxy 경로 없으면 회사 BE 사용 (localhost:8000 연결 거부 방지)
    return PROD_API_BASE_URL"""

if needle in t and "localhost:8000 연결 거부 방지" in t:
    print("  client.ts already patched (workspace → be-audio-test)")
elif "window.location.hostname.includes('workspace')" in t:
    old = """  if (window.location.hostname.includes('workspace')) {
    const m = window.location.pathname.match(/(\\/project\\/[^/]+\\/[^/]+\\/proxy\\/)\\d+/)
    if (m) return `${window.location.origin}${m[1]}8000/api`
  }

  return 'http://localhost:8000/api'"""
    new = """  if (window.location.hostname.includes('workspace')) {
    const m = window.location.pathname.match(/(\\/project\\/[^/]+\\/[^/]+\\/proxy\\/)\\d+/)
    if (m) return `${window.location.origin}${m[1]}8000/api`
    // workspace dev — proxy 경로 없으면 회사 BE 사용 (localhost:8000 연결 거부 방지)
    return PROD_API_BASE_URL
  }

  return 'http://localhost:8000/api'"""
    if old in t:
        p.write_text(t.replace(old, new), encoding="utf-8")
        print("  patched client.ts (workspace → be-audio-test)")
    else:
        print("  WARN: client.ts workspace block not matched — 수동 확인")
else:
    print("  WARN: client.ts workspace block not found — 수동 확인")
PY

echo "=== Done ==="
