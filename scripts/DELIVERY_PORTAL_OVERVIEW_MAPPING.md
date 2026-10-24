# Delivery Portal → 전 모델 일정 (Mongo overview) 매칭

## 확정 매칭 (program UUID)

| overview_id | Mongo model | Delivery program_detail | program_id |
|-------------|-------------|-------------------------|------------|
| ov-h7-vi | H7_VI | Initial H7_VI(ax26sb) | e8463fbd-8c96-4344-8343-f6e696876cc5 |
| ov-m7-vi | M7_VI | Initial M7_VI, M7_VI 모델 (AMLogic) | 44e5829c-baf6-49d1-b06f-6a37a75ed4ed |
| ov-s90c | S90C | Initial S90C (AMLogic) | b39d2ab0-e63c-44ad-8945-54f7ec1561b7 |
| ov-h7-mr10-11 | H7 MR10(11월) | H7_MR10(11월) | eedfcd5c-a434-40d3-b9db-75ea8532bda5 |
| ov-h5 | H5 | Initial H5(ax26sb) | 61fb6f57-8fb3-4468-8607-7a9fdf5a9482 |

## 제외

- **ov-m5-vi** — Mongo에서 삭제 (Delivery Audio webOS26 목록에 M5 Initial 없음)
- **H7 MR1~MR9, MR8-1, Bug Patch MR6** — 별도 overview row 없음 (MR10만 유지)

## 미매칭 overview (W5, S80C, …)

`--department Audio` 전체 TSV로 program_id 추가 후 `OVERVIEW_PROGRAM_LINKS` 에 확장.

## Sync (BE pod)

```bash
DRY=1 API_BASE=http://127.0.0.1:8000/api sh scripts/sync-overview-from-delivery-portal.sh
API_BASE=http://127.0.0.1:8000/api sh scripts/sync-overview-from-delivery-portal.sh
```

코드: `backend/services/delivery_portal_overview_sync.py`
