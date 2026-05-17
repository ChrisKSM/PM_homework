FROM node:20 as builder

WORKDIR /usr/src/app
ENV PATH /usr/src/app/node_modules/.bin:$PATH

COPY package.json ./
RUN npm config set registry https://nexus.hedej.lge.com/repository/npm-group/ --global && \
    npm install -f

ARG BUILD_ARGS
RUN if [ -n "$BUILD_ARGS" ]; then \
      echo ${BUILD_ARGS} | base64 -d > .env; \
    else \
      touch .env; \
    fi

COPY . .

# ESLint 경고 무시 + Source Map 비활성화
RUN export DISABLE_ESLINT_PLUGIN=true && \
    export GENERATE_SOURCEMAP=false && \
    npm run build

FROM nginx:1.28.1-alpine
# 보안패치
RUN apk update && apk upgrade && rm -rf /var/cache/apk/*

# 위에서 생성한 앱의 빌드산출물을 nginx의 샘플 앱이 사용하던 폴더로 이동
COPY --from=builder /usr/src/app/build /usr/share/nginx/html
COPY --from=builder /usr/src/app/settings/default.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /usr/src/app/settings/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 3000포트 오픈하고 nginx 실행
EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]