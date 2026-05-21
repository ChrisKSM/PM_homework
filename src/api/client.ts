import axios from 'axios'

const BACKEND_BASE_URL =
  window.location.hostname.includes("workspace")
    ? "https://workspace.hedej.lge.com/project/be-audio-test/seokmin-koh/proxy/8000"
    : "http://localhost:8000";

export const client = axios.create({
  baseURL: BACKEND_BASE_URL,
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
