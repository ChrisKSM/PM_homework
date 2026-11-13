# Delivery Portal — BE pod 설치 (hedej)

GitHub **브랜치** raw URL은 CDN(약 5분) 때문에 구버전 `patch-be-delivery-portal.sh`(git show)가 내려올 수 있습니다.  
**커밋 SHA** URL 또는 `patch-be-delivery-portal-from-github.sh` 를 사용하세요.

## 한 번에 (권장)

```bash
cd /workspace/project
curl -fsSL "https://raw.githubusercontent.com/ChrisKSM/PM_homework/c595c95/scripts/patch-be-delivery-portal-from-github.sh" -o /tmp/p.sh
head -5 /tmp/p.sh   # "git show" 없어야 함
sh /tmp/p.sh
```

최신 SHA는 `git log -1 --oneline` on branch `cursor/model-schedule-bar-label-fix-b14b` 참고.

## 수동 fetch (스크립트 없이)

```bash
REF=c595c95
BASE="https://raw.githubusercontent.com/ChrisKSM/PM_homework/${REF}"
curl -fsSL "$BASE/backend/routers/delivery_portal.py" -o routers/delivery_portal.py
curl -fsSL "$BASE/scripts/verify-delivery-portal-api.sh" -o scripts/verify-delivery-portal-api.sh
curl -fsSL "$BASE/scripts/restart-be-route-port.sh" -o scripts/restart-be-route-port.sh
chmod +x scripts/verify-delivery-portal-api.sh scripts/restart-be-route-port.sh
```

## .env

```env
DELIVERY_PORTAL_BASE_URL=https://delivery-portal-backend.apps.hedej.lge.com
DELIVERY_PORTAL_API_TOKEN=<JWT>
DELIVERY_PORTAL_VERIFY_SSL=true
```

```bash
cp .env /usr/app/src/.env
sh scripts/restart-be-route-port.sh
sh scripts/verify-delivery-portal-api.sh direct
```
