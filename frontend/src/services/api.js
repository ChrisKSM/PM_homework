import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 60000 });

api.interceptors.response.use(
  (r) => r.data,
  (err) => Promise.reject(err.response?.data?.detail || err.message || 'API Error')
);

export const jiraApi = {
  getProjects: () => api.get('/jira/projects'),
  getBoards: (projectKey) => api.get(`/jira/projects/${projectKey}/boards`),
  getSprints: (boardId, state) =>
    api.get(`/jira/boards/${boardId}/sprints`, { params: state ? { state } : {} }),
};

export const sprintApi = {
  getIssues: (sprintId) => api.get(`/sprint/${sprintId}/issues`),
  getWBS: (sprintId) => api.get(`/sprint/${sprintId}/wbs`),
  getStats: (sprintId, boardId) =>
    api.get(`/sprint/${sprintId}/stats`, { params: boardId ? { board_id: boardId } : {} }),
};

export const analysisApi = {
  analyze: (sprintId, boardId) =>
    api.post(`/analysis/sprint/${sprintId}`, null, { params: boardId ? { board_id: boardId } : {} }),
  quickRisks: (sprintId) => api.post(`/analysis/sprint/${sprintId}/risks`),
};
