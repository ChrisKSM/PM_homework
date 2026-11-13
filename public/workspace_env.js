// 런타임 override. 공용 react-audio FE는 client.ts가 BE_AXSTUDIO(공용 Route)를 사용.
// 개인 Worker Port URL을 여기 넣지 마세요 — 노트북/세션 종료 시 503.
window.workspace_env = {
  REACT_APP_API_BASE_URL: 'https://be-audio-test.apps.axstudio.lge.com/api',
};
