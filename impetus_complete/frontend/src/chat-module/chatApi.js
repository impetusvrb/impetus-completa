/**
 * IMPETUS CHAT - API Service
 */
import api from '../services/api';

const BASE = '/chat';

export const chatApi = {
  getColaboradores: () => api.get(`${BASE}/colaboradores`),
  getConversations: (params) => api.get(`${BASE}/conversations`, { params }),
  createConversation: (data) => api.post(`${BASE}/conversations`, data),
  getConversation: (id) => api.get(`${BASE}/conversations/${id}`),
  getMessages: (id, params) => api.get(`${BASE}/conversations/${id}/messages`, { params }),
  sendMessage: (id, data, config) => api.post(`${BASE}/conversations/${id}/messages`, data, config),
  invokeAI: (id, action, context) => api.post(`${BASE}/conversations/${id}/invoke-ai`, { action, context }),
  addImpetusIA: (conversationId) => api.post(`${BASE}/add-impetus-ia/${conversationId}`)
};
