FROM node:20 as builder

RUN apt-get update && apt-get upgrade -y && apt-get clean

# 작업 폴더를 만들고 npm 설치
RUN mkdir /usr/src/app
WORKDIR /usr/src/app
ENV PATH /usr/src/app/node_modules/.bin:$PATH
COPY package.json /usr/src/app/package.json
RUN npm config set registry https://nexus.hedej.lge.com/repository/npm-group/ --global
RUN npm install -f

ARG BUILD_ARGS
RUN echo ${BUILD_ARGS} | base64 -d > .env || echo "skip env"

RUN cat .env
# 소스를 작업폴더로 복사하고 빌드
COPY . /usr/src/app
RUN npm run build
RUN ls /usr/src/app


FROM nginx:1.28.1-alpine

# 보안패치
RUN apk update && apk upgrade && rm -rf /var/cache/apk/*

    
# 위에서 생성한 앱의 빌드산출물을 nginx의 샘플 앱이 사용하던 폴더로 이동
COPY --from=builder /usr/src/app/build /usr/share/nginx/html
COPY --from=builder /usr/src/app/settings/default.conf /etc/nginx/conf.d/default.conf

# entrypoint 스크립트 복사 및 실행 권한 부여
COPY --from=builder /usr/src/app/settings/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 3000포트 오픈하고 entrypoint 스크립트 실행
EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
