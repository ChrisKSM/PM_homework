# Delivery Portal → 전 모델 일정 매칭용 데이터 설명

## API 2종

| API | 용도 | 최상위 형태 |
|-----|------|-------------|
| `GET /api/v1/all_deliveries_data/` | Gantt/마일스톤 **일정 바** (test별 plan/actual) | `{ global_data, platform_data[] }` |
| `GET /api/v1/program-report/` | 프로그램 **주간·현황 리포트** | `[]` (36건 등) |

## platform 20개 = `platform_data[]` 한 블록

각 블록은 **webOS 세대/플랫폼 이름** 하나입니다 (예: `webOS27`, `webOS26`).

```
platform_data[i]
├── platform          ← "webOS27" (20개 중 하나)
└── program_info[]    ← 그 플랫폼 아래 프로그램(Initial/MR1, …)
    ├── id              (UUID)
    ├── program         ← "Initial/MR1"
    ├── program_detail  ← "webOS27 PI 프로그램"
    └── details[]       ← Gantt **한 줄** (SOC·site·담당 등)
        ├── department, soc, site, region, status, pl, show
        ├── product_category ← UI Product category (Audio_Soundbar, Audio_Speaker, …)
        ├── product, model (있을 때)
        └── schedules[] ← 일정 막대
            ├── test_name       ← "SIT1", "FC1", "QP", …
            ├── plan_start_date / plan_end_date
            └── actual_start_date / actual_end_date
```

- **매칭 키 후보:** `platform` + `program` + `program_detail` + `details[].soc` + `site` + `department`
- `show=N` 인 detail 은 Gantt에서 제외(우리 export도 동일).

## Mongo `model_schedule_overview` (현재 S80C)

문서 1건 ≈ `OverviewModel`:

- `id` (예: `ov-h7-vi`, `ov-s80c`)
- `category`, `model`, `variant`, `soc`, `swPm`, `spec`, `pv`, `mp`
- `events[]`: `{ name, start, end, kind: hw|sw, barType? }`

**Delivery → Overview 매핑(예정, 규칙은 PO 확정):**

- `details.soc` / program 이름 ↔ `OverviewModel.model`·`variant`
- `schedules[].test_name` ↔ `events[].name` (+ SIT/FC → `barType`, HW/SW → `kind`)
- `program-report` 의 `progress_*`, `pv`, `mp` 등 ↔ `pv`/`mp` 컬럼 보강

## 카탈로그 뽑기 (BE pod)

```bash
sh scripts/verify-delivery-portal-api.sh direct
python3 scripts/export-delivery-portal-catalog.py
# 또는
python3 scripts/export-delivery-portal-catalog.py --fetch
```

**Audio department (플랫폼 전체):**

```bash
python3 scripts/export-delivery-portal-catalog.py /tmp/dp_all_deliveries_data.json --department Audio
python3 scripts/export-delivery-portal-catalog.py /tmp/dp_all_deliveries_data.json --department Audio --platform webOS26
python3 scripts/export-delivery-portal-catalog.py /tmp/dp_all_deliveries_data.json --department Audio --schedules
```

**Product category 4종 (Portal UI와 동일 — 전 모델 목록):**

`Audio_Earbud`, `Audio_Others`, `Audio_Soundbar`, `Audio_Speaker`

```bash
python3 scripts/export-delivery-portal-catalog.py /tmp/dp_all_deliveries_data.json --list-product-categories
python3 scripts/export-delivery-portal-catalog.py /tmp/dp_all_deliveries_data.json --audio-products
python3 scripts/export-delivery-portal-catalog.py /tmp/dp_all_deliveries_data.json --audio-products --schedules
python3 scripts/export-delivery-portal-catalog.py /tmp/dp_all_deliveries_data.json --audio-products --models-only
```

생성 파일:

- `/tmp/delivery-portal-catalog.tsv` — detail 1행 = platform×program×soc×site…
- `/tmp/delivery-portal-audio.tsv` — department=Audio 만
- `/tmp/delivery-portal-audio-schedules.tsv` — `--schedules` 시 일정 bar 단위
- `/tmp/delivery-portal-audio-products-models.tsv` — program 1행 = 모델 후보 (매칭용)
- `/tmp/delivery-portal-audio-products.tsv` — product category 필터 detail 전체
- `/tmp/delivery-portal-program-report.tsv` — program-report 전체

**Mongo sync (BE pod, seed 후):**

```bash
DRY=1 SCOPE=audio_products API_BASE=http://127.0.0.1:8000/api sh scripts/sync-overview-from-delivery-portal.sh
SCOPE=audio_products API_BASE=http://127.0.0.1:8000/api sh scripts/sync-overview-from-delivery-portal.sh
```

TSV를 엑셀/스프레드시트로 열어 Mongo 모델 id(`ov-*`)와 옆에 매칭列을 채우면 됩니다.
