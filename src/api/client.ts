import axios from 'axios'

// 런타임(Docker 컨테이너): entrypoint.sh가 window.workspace_env 에 환경변수 주입
// 개발환경: .env 파일의 process.env 사용
const workspaceEnv = (window as any).workspace_env ?? {}

const baseURL =
  workspaceEnv.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_BASE_URL ||
  '/api'

const client = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

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
