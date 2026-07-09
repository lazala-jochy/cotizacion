import { api } from '../../../api';

export const dashboardApi = {
  summary: () => api.dashboard.summary(),
  executive: () => api.dashboard.executive(),
  analytics: () => api.dashboard.analytics(),
  notifications: () => api.dashboard.notifications(),
  insights: () => api.dashboard.insights(),
  pipeline: () => api.dashboard.pipeline(),
  movePipeline: (quoteId, stageId) => api.dashboard.movePipeline(quoteId, stageId),
  automations: () => api.dashboard.automations(),
  updateAutomations: (body) => api.dashboard.updateAutomations(body),
  automationTasks: () => api.dashboard.automationTasks(),
  clientsCrm: () => api.dashboard.clientsCrm(),
  clientCrm: (id) => api.dashboard.clientCrm(id),
};
