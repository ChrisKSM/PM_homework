# 시스템팀 문의 — BE pod uvicorn(8000) 자동 기동·유지

개발자가 `exec`로 `uv run … uvicorn`을 수동 실행하면 API는 동작하나, **시간 경과·pod 재시작·세션 종료 후 port 8000에 리스너가 없어** Worker/Route에서 **503**이 발생합니다.

아래 항목을 티켓에 붙이면 원인 파악에 도움이 됩니다.

---

## 1. 요청 한 줄 (목표)

> Deployment `project-be-audio-test-<계정>` (또는 해당 BE) **컨테이너 기동 시**  
> `uvicorn main:app --host 0.0.0.0 --port 8000` 이 **supervisor/entrypoint로 상시 실행**되고,  
> **프로세스 종료·import 실패·OOM 시 자동 재시작**되도록 설정/점검 요청.

(프로젝트 표준: `uv run --frozen python -m uvicorn main:app --host 0.0.0.0 --port 8000`, cwd `/workspace/project`)

---

## 2. 증상

- Worker URL 또는 Route: **HTTP 503**, body 짧은 plain text (FastAPI JSON 아님)
- pod **exec** 후 수동 uvicorn 기동 → **127.0.0.1:8000/health 200** → 잠시 정상
- **pod 재시작 / 시간 경과 / PC 종료(워크스페이스 disconnect) 후** 다시 503
- `scan-be-listeners`: **port 8000 —** (리스너 없음)
- `/tmp/uvicorn-8000.log` 없음 또는 기동 직후 종료 로그

---

## 3. 환경 정보 (티켓에 기입)

| 항목 | 예시 |
|------|------|
| Deployment / Pod | `project-be-audio-test-seokmin-koh-deployment-…` |
| Pod hostname | `…-jm6hz` (exec `hostname`) |
| Namespace / Cluster | (AX Studio 프로젝트명) |
| Worker Port URL | `https://be-audio-test--8000--<계정>.apps.axstudio.lge.com` |
| 공용 Route (참고) | `https://be-audio-test.apps.axstudio.lge.com` |
| FE가 치는 BE | Worker URL / 공용 Route 중 **Network 탭 실제 URL** |
| 이미지/빌드 시각 | Deployment describe 또는 About |

---

## 4. exec에서 수집해 첨부할 출력 (503 재현 직후)

```bash
cd /workspace/project
hostname
date -u
curl -s -o /dev/null -w "health_local=%{http_code}\n" http://127.0.0.1:8000/health || echo health_local=000

# Python / uv
command -v uv; uv --version 2>/dev/null || true
uv run --frozen python -c "import main; print('import_main=OK')" 2>&1 || venv/bin/python -c "import main" 2>&1

# 리스너 (없으면 ss/netstat 대신 health만으로도 OK)
for p in 8000 8080; do
  curl -sf --max-time 2 "http://127.0.0.1:${p}/health" >/dev/null && echo "port_${p}=UP" || echo "port_${p}=DOWN"
done

# 플랫폼 uvicorn 로그 (경로는 환경마다 다를 수 있음)
tail -50 /tmp/uvicorn-8000.log 2>/dev/null || echo "no /tmp/uvicorn-8000.log"
```

**수동 기동 직후 정상일 때** (대조용):

```bash
curl -s http://127.0.0.1:8000/health
curl -s http://127.0.0.1:8000/api/jira/diagnose | head -c 400
```

---

## 5. 시스템팀에 확인 요청할 질문

1. **Entrypoint/CMD**가 실제로 `uvicorn main:app --host 0.0.0.0 --port 8000` 인지, **cwd**가 `/workspace/project` 인지.
2. “8일 전부터 uvicorn 실행 중” 판단 기준이 **PID/프로세스 트리**인지 — **8000 listen + /health 200**과 불일치하는 사례가 있는지.
3. uvicorn **크래시 시 재시작** (restartPolicy, supervisor, s6, systemd in container 등) 여부.
4. **Liveness/Readiness probe**가 `/health` 인지, probe 실패 시 pod만 재시작하고 **앱은 안 띄우는** 설정은 아닌지.
5. `import main` 실패(배포 코드/venv 불일치) 시 **CrashLoopBackOff** 로그를 볼 수 있는지.
6. `.env`는 **`/workspace/project/.env`와 `/usr/app/src/.env` 동기화**가 기동 시 필요한지 — entrypoint에서 copy 하는지.
7. **Worker Route(8000)** 와 **공용 be-audio-test Route** 가 **다른 Deployment/replica** 를 가리키는지 (exec pod만 고쳐도 브라우저 503인 경우).

---

## 6. 개발 측에서 알려줄 제약 (오해 방지)

- repo의 `restart-be-route-port.sh` / `uv run` 은 **운영 자동화가 아니라 exec 복구용**입니다.
- **PC 종료**는 클라이언트 이슈이나, **서버 pod의 uvicorn은 pod lifetime 동안 유지**되어야 합니다. 유지되지 않으면 **플랫폼 기동/감시** 문제입니다.
- pod **Rollout/재배포** 후에는 새 이미지/entrypoint로 다시 떠야 하며, **수동 uvicorn은 rollout 시 소멸**하는 것이 정상입니다 — 그때 **entrypoint가 다시 띄워야** 합니다.

---

## 7. 티켓 본문 예시 (복사용)

```
[증상]
BE Worker URL (또는 Route) API 503. pod exec 시 127.0.0.1:8000/health 는 000.
수동: uv run --frozen python -m uvicorn main:app --host 0.0.0.0 --port 8000 실행 시 health 200.

[기대]
컨테이너 start 시 entrypoint/supervisor가 위 uvicorn을 port 8000에 기동·유지·crash 시 재시작.

[실제]
시간 경과 또는 pod 재시작 후 8000 리스너 없음 (scan: port 8000 DOWN).
이전 답변 "8일 전 uvicorn 실행"과 현재 pod health 불일치 가능.

[환경]
Deployment: project-be-audio-test-<계정>
Pod: <hostname>
Worker URL: https://be-audio-test--8000--<계정>.apps.axstudio.lge.com

[첨부]
- hostname / health_local=000 또는 200
- import main 결과 (OK/NG + traceback)
- entrypoint 로그 또는 /tmp/uvicorn-8000.log

[요청]
1) 8000 listen + /health 기준 프로세스 감시 방식 점검
2) uvicorn crash/import 실패 시 로그·재기동 정책
3) 기동 시 .env (/workspace/project → /usr/app/src) 반영 여부
```
