# Delivery Portal → 전 모델 일정 (Mongo overview) 매칭

## 확정 매칭 (program UUID — webOS26)

| overview_id | Mongo model | Delivery program_detail | program_id |
|-------------|-------------|-------------------------|------------|
| ov-h7-vi | H7_VI | H7_VI(ax26sb) | e8463fbd-8c96-4344-8343-f6e696876cc5 |
| ov-m7-vi | M7_VI | M7_VI, M7_VI 모델 (AMLogic) | 44e5829c-baf6-49d1-b06f-6a37a75ed4ed |
| ov-s90c | S90C | S90C (AMLogic) | b39d2ab0-e63c-44ad-8945-54f7ec1561b7 |
| ov-h7-mr10-11 | H7 MR10(11월) | H7_MR10(11월) | eedfcd5c-a434-40d3-b9db-75ea8532bda5 |
| ov-h5 | H5 | H5(ax26sb) | 61fb6f57-8fb3-4468-8607-7a9fdf5a9482 |

## PO 별칭 (program 표기 → Mongo model)

| Portal (model / program_detail) | Mongo model | overview_id |
|-----------------------------------|-------------|-------------|
| Realtime -OS / Dolby Atmos / MLC3… | S80C | ov-s80c |
| HDMI Connect Box | CB-SH | ov-cb-sh |
| Sound Suite W5 / Bouffalo SubWoofer W5 | W5 | ov-w5 |
| Power 9000 / 7000 / 5000 (440W) | Power9000 | ov-power9000 |
| xboom Buds 윈도우PC 앱 | 윈도우PC 앱 | ov-pc |

나머지 program (XT7S, Stage501, Bounce, M7/M5 MR10… 등)은 `resolve_overview_identity` 규칙 + seed `ov-*` id로 **신규/기존 row 자동 매칭**.  
export `*-models.tsv` 의 `overview_model`, `overview_id` 열로 사전 확인.

## 제외

- **ov-m5-vi** — Mongo에서 삭제 (Delivery Audio webOS26 목록에 M5 Initial 없음)
- **H7 MR1~MR9, MR8-1, Bug Patch MR6** — 별도 overview row 없음 (MR10만 유지)

## Sync (BE pod)

```bash
DRY=1 SCOPE=audio_products API_BASE=http://127.0.0.1:8000/api sh scripts/sync-overview-from-delivery-portal.sh
SCOPE=audio_products API_BASE=http://127.0.0.1:8000/api sh scripts/sync-overview-from-delivery-portal.sh
```

- **scope=linked** — 위 5 program UUID만
- **scope=audio_products** — Audio_* product category 전 program (별칭 + upsert + 동일 id events merge)

코드: `scripts/delivery_portal_catalog_lib.py` (`resolve_overview_identity`), `backend/services/delivery_portal_overview_sync.py`
