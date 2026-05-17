#!/bin/sh

echo "=== Generating env.js from environment variables ==="

# 환경변수를 env.js 파일로 생성
cat > /usr/share/nginx/html/workspace_env.js << 'EOF'
window.workspace_env = {
EOF

# 환경변수 중에서 프론트엔드에서 사용할 것들만 필터링하여 추가
printenv | grep -E '^(REACT_APP_|VITE_|API_|NODE_ENV|PUBLIC_)' | sort | while IFS='=' read -r key value; do
  # 값에 있는 특수문자들을 이스케이프 처리
  escaped_value=$(echo "$value" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed "s/'/\\'/g")
  echo "  $key: \"$escaped_value\"," >> /usr/share/nginx/html/workspace_env.js
done

cat >> /usr/share/nginx/html/workspace_env.js << 'EOF'
};
EOF

echo "Generated workspace_env.js file:"
cat /usr/share/nginx/html/workspace_env.js
echo "=================================="

# nginx 시작
exec nginx -g "daemon off;"