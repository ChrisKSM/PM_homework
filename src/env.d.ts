declare namespace NodeJS {
  interface ProcessEnv {
    REACT_APP_API_BASE_URL?: string;
    REACT_APP_USE_MOCK?: string;
    NODE_ENV: 'development' | 'production' | 'test';
  }
}
