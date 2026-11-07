#!/bin/sh
# FE pod — .gitlab-ci.yml 에서 build/deploy 대상 요약 (oc 없이)
#   sh scripts/read-gitlab-fe-deploy-target.sh
set -e
cd "$(dirname "$0")/.."
F=.gitlab-ci.yml
[ -f "$F" ] || { echo "NG  $F 없음"; exit 1; }

echo "=== CI 변수 (gitlab-ci.yml) ==="
grep -E '^(  )?(IMAGE_NAME|DEV_DEPLOYMENT|PROD_DEPLOYMENT|CI_PROJECT)' "$F" | head -20

echo ""
echo "=== deploy 관련 job ==="
awk '/^[a-zA-Z0-9_.-]+:/ { job=$1; sub(/:$/,"",job) }
     /^deploy/ || job ~ /deploy/ { print job }' "$F" | sort -u

echo ""
echo "=== deploy-on-dev-k8s (또는 deploy*) script 본문 ==="
# sed: deploy-on-dev-k8s job 의 script 섹션만 대략 출력
sed -n '/^deploy-on-dev-k8s:/,/^[^ ]/p' "$F" | head -80

echo ""
echo "=== release 태그 시 prod build ==="
sed -n '/^build-official:/,/^[^ ]/p' "$F" | grep -E 'rules:|IS_PROD|when:' | head -10

echo ""
echo "=== 해석 ==="
echo "  • build-official(IS_PROD) → registry: \${IMAGE_NAME}:1.0.175"
echo "  • deploy job 이 kubectl set image … 하면 그 Deployment 만 갱신"
echo "  • react-audio.apps.axstudio.lge.com 이 그 Deployment 와 다르면 공용 URL은 안 바뀜"
echo ""
echo "  GitLab → Pipelines → release_1.0.175 → deploy* job 로그에서:"
echo "    deployment/..., image:..., namespace, (있다면) ingress/route URL"
