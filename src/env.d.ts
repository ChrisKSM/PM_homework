declare namespace NodeJS {
  interface ProcessEnv {
    VITE_API_BASE_URL?: string;
    VITE_USE_MOCK?: string;
    NODE_ENV: 'development' | 'production' | 'test';
  }
}
