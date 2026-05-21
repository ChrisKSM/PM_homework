import axios from 'axios'

// 런타임(Docker 컨테이너): entrypoint.sh가 window.workspace_env 에 환경변수 주입
// 개발환경: .env 파일의 process.env 사용
const isProd = process.env.NODE_ENV === "production";

const backendUrl = isProd
  ? "https://workspace.hedej.lge.com/project/be-audio-test/seokmin-koh/proxy/8000"
  : "https://workspace.hedej.lge.com/project/be-audio-test/seokmin-koh/proxy/8000";


export const client = axios.create({
  baseURL: backendUrl,
  withCredentials: true,
});


client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Unauthorized — Jira API 인증이 필요합니다.')
    }
    return Promise.reject(error)
  }
)

export default client
