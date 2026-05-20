# Daily Dashboard Report — 설계 초안

매일 특정 시간에 **책임자 / 개발팀 대시보드** 스냅샷을 HTML 이메일로 발송합니다.

## 아키텍처

```
[K8s CronJob]  (평일 08:00 KST)
    │
    ▼
scripts/send_daily_report.py
    │
    ├─► services/report_service.py   … Jira 데이터 수집 + HTML 렌더
    │
    └─► services/email_service.py    … SMTP 발송
```

- **데이터 소스**: 기존 `jira_service.py` (대시보드 API와 동일)
- **리포트 형식**: Jinja2 HTML (LG 화이트+레드 테마)
- **실행 방식**: K8s CronJob (권장) 또는 수동 API/CLI

## 파일 구조

| 파일 | 역할 |
|------|------|
| `services/report_service.py` | 리포트 데이터 수집 + 템플릿 렌더 |
| `services/email_service.py` | SMTP 메일 발송 |
| `templates/daily_report.html` | HTML 이메일 템플릿 (초안) |
| `scripts/send_daily_report.py` | CronJob / CLI 진입점 |
| `routers/report.py` | 수동 트리거·미리보기 API |
| `k8s/cronjob-daily-report.yaml` | K8s 스케줄 Job 예시 |

## 환경 변수 (.env)

```env
# 리포트 발송
REPORT_ENABLED=true
REPORT_RECIPIENTS=seokmin.koh@lge.com
REPORT_SUBJECT_PREFIX=[Jira Dashboard]
REPORT_DASHBOARD_URL=https://workspace.hedej.lge.com/your-app

# SMTP (회사 메일 서버 정보로 교체)
SMTP_HOST=smtp.lge.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@lge.com
SMTP_USE_TLS=true

# 수동 API 보호 (선택)
REPORT_API_KEY=your-secret-key
```

## CLI 사용법

```bash
cd backend
python scripts/send_daily_report.py              # 발송
python scripts/send_daily_report.py --dry-run    # HTML만 생성 (메일 X)
python scripts/send_daily_report.py --output /tmp/report.html
```

## API (테스트용)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/report/preview` | HTML 미리보기 (브라우저) |
| POST | `/api/report/send` | 즉시 발송 (`X-Report-Key` 헤더) |

## K8s CronJob

`k8s/cronjob-daily-report.yaml` 참고.

- 스케줄: `0 8 * * 1-5` (KST 08:00, 평일)
- backend 이미지와 동일 컨테이너에서 `send_daily_report.py` 실행

## 초안 리포트 포함 섹션 (다음 단계에서 조정 가능)

### 책임자 대시보드
- [x] KPI 4종 (진행률, Epic, Story, 블로커)
- [x] Epic 진행률 Top 5 (표)
- [x] 이슈 상태 분포
- [x] Velocity 최근 3스프린트
- [x] 리스크/블로커 Top 5

### 개발팀 대시보드
- [x] 스프린트 KPI (이름, D-day, 완료율, 블로커)
- [x] Burndown 요약 (시작/현재/목표 SP)
- [x] 팀원별 워크로드 Top 5
- [ ] 상세 이슈 목록 (초안 제외 — 용량/노이즈 고려)

## 다음 단계 체크리스트

- [ ] 수신자 목록 확정
- [ ] 발송 시간 확정 (KST)
- [ ] SMTP 서버 정보 (회사 IT)
- [ ] 포함/제외할 섹션 결정
- [ ] PDF 첨부 필요 여부 (WeasyPrint 추가)
- [ ] 실패 시 알림 수신자
