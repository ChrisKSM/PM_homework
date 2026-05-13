export const config = {
  environment: import.meta.env.VITE_ENVIRONMENT || 'local',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
}