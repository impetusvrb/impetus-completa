/**
 * API SERVICE
 * Gerenciamento de todas as chamadas à API do backend
 * Inclui: timeout, retry com backoff, tratamento de erros
 */

import axios from 'axios';

// Em dev: use /api para o proxy do Vite redirecionar ao backend. Em prod: use URL completa.
const API_URL = import.meta.env.VITE_API_URL || '/api';
const REQUEST_TIMEOUT_MS = 60000; // 60 segundos - evita requisições penduradas
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

// Criar instância do axios
const api = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('impetus_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para retry automático (5xx, timeout, rede) e tratamento de erros
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};

    // Nunca fazer retry em erros de autenticação/autorização
    if (error.response?.status === 401 || error.response?.status === 403) {
      return handleFinalError(error);
    }

    const retryCount = config.__retryCount ?? 0;
    const isRetryable =
      retryCount < MAX_RETRIES &&
      (['ECONNABORTED', 'ERR_NETWORK', 'ETIMEDOUT'].includes(error.code) ||
        [502, 503, 504].includes(error.response?.status));

    if (isRetryable) {
      config.__retryCount = retryCount + 1;
      const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
      await new Promise((r) => setTimeout(r, Math.min(delay, 5000)));
      return api.request(config);
    }

    return handleFinalError(error);
  }
);

function handleFinalError(error) {
  if (error.response?.status === 401) {
    localStorage.removeItem('impetus_token');
    localStorage.removeItem('impetus_user');
    window.location.href = '/';
  }
  if (error.response?.status === 403 && error.response?.data?.code === 'LICENSE_INVALID') {
    error.apiMessage = 'Licença inválida ou expirada. Entre em contato com o suporte.';
    window.location.href = '/license-expired';
  } else if (error.response?.status === 403 && error.response?.data?.code === 'COMPANY_INACTIVE') {
    error.apiMessage = error.response?.data?.error || 'Assinatura em atraso. Regularize o pagamento para continuar.';
    window.location.href = error.response?.data?.redirect || '/subscription-expired';
  } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    error.apiMessage = 'Tempo esgotado. Verifique sua conexão e tente novamente.';
  } else if (error.code === 'ERR_NETWORK') {
    error.apiMessage = 'Sem conexão. Verifique sua internet.';
  } else if (error.response?.data?.error) {
    error.apiMessage = error.response.data.error;
  } else {
    error.apiMessage = error.message || 'Erro ao processar requisição';
  }
  return Promise.reject(error);
}

// ============================================================================
// EMPRESAS (Multi-Tenant)
// ============================================================================

export const companies = {
  create: (data) => api.post('/companies', data),
  getMe: () => api.get('/companies/me')
};

export const setupCompany = {
  complete: (data) => api.post('/setup-company', data),
  changePassword: (newPassword) =>
    api.post('/setup-company/change-password', { new_password: newPassword })
};

export const onboarding = {
  getStatus: () => api.get('/onboarding/status'),
  start: (tipo) => api.post('/onboarding/start', { tipo }),
  respond: (tipo, answer) => api.post('/onboarding/respond', { tipo, answer }),
  getHistory: (tipo) => api.get(`/onboarding/history?tipo=${tipo || 'usuario'}`),
  getContext: () => api.get('/onboarding/context')
};

// Identificação e ativação de usuário (segurança IA)
export const userIdentification = {
  getStatus: () => api.get('/user-identification/status'),
  activationStart: () => api.post('/user-identification/activation/start'),
  activationRespond: (answer) => api.post('/user-identification/activation/respond', { answer }),
  firstAccess: (data) => api.post('/user-identification/first-access', data),
  dailyVerify: (fullName, pin) => api.post('/user-identification/daily-verify', { fullName, pin }),
  seedRegistry: () => api.post('/user-identification/seed-registry')
};

export const subscription = {
  getPaymentLink: () => api.get('/subscription/payment-link')
};

export const zapi = {
  connect: (manual = false, manualData = null) =>
    api.post('/zapi/connect', manual && manualData ? { manual: true, ...manualData } : {}),
  getStatus: () => api.get('/zapi/status'),
  getQRCode: () => api.get('/zapi/qr-code')
};

export const whatsapp = {
  connect: (manual = false, manualData = null) =>
    api.post('/whatsapp/connect', manual && manualData ? { manual: true, ...manualData } : {}),
  getStatus: () => api.get('/whatsapp/status'),
  getQRCode: () => api.get('/whatsapp/qr-code'),
  getStats: () => api.get('/whatsapp/stats')
};

// ============================================================================
// AUTENTICAÇÃO
// ============================================================================

export const auth = {
  login: (email, password) => 
    api.post('/auth/login', { email, password }),
  
  logout: () => 
    api.post('/auth/logout'),
  
  register: (userData) => 
    api.post('/auth/register', userData),
  
  me: () => 
    api.get('/auth/me'),
  
  getSessions: () => 
    api.get('/auth/sessions')
};

// ============================================================================
// DASHBOARD
// ============================================================================

export const dashboard = {
  getSummary: () => 
    api.get('/dashboard/summary'),
  
  getTrend: (months = 6) => 
    api.get(`/dashboard/trend?months=${months}`),
  
  getInsights: (limit = 10, offset = 0) =>
    api.get(`/dashboard/insights?limit=${limit}&offset=${offset}`),
  
  getMonitoredPointsDistribution: () => 
    api.get('/dashboard/monitored-points-distribution'),
  
  getRecentInteractions: (limit = 10, offset = 0) =>
    api.get(`/dashboard/recent-interactions?limit=${limit}&offset=${offset}`),

  getKPIs: () =>
    api.get('/dashboard/kpis'),

  getPlcAlerts: (acknowledged = false) => 
    api.get(`/plc-alerts?acknowledged=${acknowledged}`),

  acknowledgePlcAlert: (id) => 
    api.post(`/plc-alerts/${id}/acknowledge`),

  getSmartSummary: () => 
    api.get('/dashboard/smart-summary'),

  chat: (message, history = []) => 
    api.post('/dashboard/chat', { message, history }),

  logActivity: (data) => 
    api.post('/dashboard/log-activity', data),

  getVisibility: () => 
    api.get('/dashboard/visibility'),

  getUserContext: () =>
    api.get('/dashboard/user-context'),

  executiveQuery: (query, modoApresentacao = false) =>
    api.post('/dashboard/executive-query', { query, modoApresentacao }),

  orgAIAssistant: (question) =>
    api.post('/dashboard/org-ai-assistant', { question })
};

// ============================================================================
// COMUNICAÇÕES
// ============================================================================

export const communications = {
  list: (params = {}) => 
    api.get('/communications', { params }),
  
  getById: (id) => 
    api.get(`/communications/${id}`),
  
  create: (data) => 
    api.post('/communications', data),
  
  getRecent: (limit = 10) => 
    api.get(`/communications/recent?limit=${limit}`)
};

// ============================================================================
// PRÓ-AÇÃO
// ============================================================================

export const proacao = {
  list: () => 
    api.get('/proacao'),
  
  getById: (id) => 
    api.get(`/proacao/${id}`),
  
  create: (data) => 
    api.post('/proacao', data),
  
  evaluate: (id) => 
    api.post(`/proacao/${id}/evaluate`),
  
  escalate: (id, comment, escalatedBy) => 
    api.post(`/proacao/${id}/escalate`, { comment, escalated_by: escalatedBy }),
  
  assign: (id, adminSector, assignedBy, team) => 
    api.post(`/proacao/${id}/assign`, { admin_sector: adminSector, assigned_by: assignedBy, team }),
  
  recordPhaseData: (id, phaseNumber, collectedData, userId) => 
    api.post(`/proacao/${id}/record`, { phaseNumber, collectedData, userId }),
  
  finalize: (id, finalReport, closedBy) => 
    api.post(`/proacao/${id}/finalize`, { finalReport, closedBy })
};

// ============================================================================
// DIAGNÓSTICO (MANUTENÇÃO ASSISTIDA)
// ============================================================================

export const diagnostic = {
  validate: (text) => 
    api.post('/diagnostic/validate', { text }),
  
  analyze: (text, reporter) => 
    api.post('/diagnostic', { text, reporter: reporter || 'web-user' }),
  
  getReport: (diagId) => 
    api.get(`/diagnostic/report/${diagId}`, { responseType: 'text' })
};

// ============================================================================
// TAREFAS
// ============================================================================

export const tasks = {
  list: () => 
    api.get('/tasks'),
  
  create: (data) => 
    api.post('/tasks', data),
  
  update: (id, data) => 
    api.put(`/tasks/${id}`, data),
  
  delete: (id) => 
    api.delete(`/tasks/${id}`)
};

// ============================================================================
// LGPD
// ============================================================================

export const lgpd = {
  registerConsent: (consentType, granted, consentText) => 
    api.post('/lgpd/consent', { consent_type: consentType, granted, consent_text: consentText }),
  
  revokeConsent: (type) => 
    api.delete(`/lgpd/consent/${type}`),
  
  exportMyData: () => 
    api.get('/lgpd/my-data'),
  
  createDataRequest: (requestType, description) => 
    api.post('/lgpd/data-request', { request_type: requestType, description }),
  
  getMyDataRequests: () => 
    api.get('/lgpd/data-requests'),
  
  deleteAccount: (confirmation) => 
    api.delete('/lgpd/delete-my-account', { data: { confirmation } })
};

// ============================================================================
// ADMINISTRAÇÃO - USUÁRIOS
// ============================================================================

export const adminUsers = {
  list: (params = {}) => 
    api.get('/admin/users', { params }),
  
  getById: (id) => 
    api.get(`/admin/users/${id}`),
  
  create: (userData) => 
    api.post('/admin/users', userData),
  
  update: (id, userData) => 
    api.put(`/admin/users/${id}`, userData),
  
  delete: (id) => 
    api.delete(`/admin/users/${id}`),
  
  resetPassword: (id, newPassword) => 
    api.post(`/admin/users/${id}/reset-password`, { new_password: newPassword }),
  
  terminateSession: (userId, sessionId) => 
    api.delete(`/admin/users/${userId}/sessions/${sessionId}`),
  
  getStats: () => 
    api.get('/admin/users/stats/summary')
};

// ============================================================================
// ADMINISTRAÇÃO - DEPARTAMENTOS
// ============================================================================

export const adminDepartments = {
  list: (includeInactive = false) => 
    api.get('/admin/departments', { params: { include_inactive: includeInactive } }),
  
  getTree: () => 
    api.get('/admin/departments/tree'),
  
  getById: (id) => 
    api.get(`/admin/departments/${id}`),
  
  create: (data) => 
    api.post('/admin/departments', data),
  
  update: (id, data) => 
    api.put(`/admin/departments/${id}`, data),
  
  delete: (id) => 
    api.delete(`/admin/departments/${id}`),
  
  getStats: () => 
    api.get('/admin/departments/stats/summary')
};

// ============================================================================
// ADMINISTRAÇÃO - LOGS
// ============================================================================

export const adminLogs = {
  getAuditLogs: (params = {}) => 
    api.get('/admin/logs/audit', { params }),
  
  getDataAccessLogs: (params = {}) => 
    api.get('/admin/logs/data-access', { params }),
  
  getAuditLogById: (id) => 
    api.get(`/admin/logs/audit/${id}`),
  
  getStats: (days = 7) => 
    api.get(`/admin/logs/stats/summary?days=${days}`),
  
  getSecurityStats: () => 
    api.get('/admin/logs/stats/security'),
  
  exportLogs: (type, format, filters) => 
    api.post('/admin/logs/export', { type, format, filters })
};

// ============================================================================
// ADMINISTRAÇÃO - CONFIGURAÇÕES
// ============================================================================

export const adminSettings = {
  // Empresa
  getCompany: () => 
    api.get('/admin/settings/company'),
  
  updateCompany: (data) => 
    api.put('/admin/settings/company', data),
  
  // Z-API
  getZApiConfig: () => 
    api.get('/admin/settings/zapi'),
  
  saveZApiConfig: (config) => 
    api.post('/admin/settings/zapi', config),
  
  testZApiConnection: () => 
    api.post('/admin/settings/zapi/test'),
  
  // POPs
  listPops: () => 
    api.get('/admin/settings/pops'),
  
  createPop: (formData) => api.post('/admin/settings/pops', formData),
  
  deletePop: (id) => 
    api.delete(`/admin/settings/pops/${id}`),
  
  // Manuais
  listManuals: () => 
    api.get('/admin/settings/manuals'),
  
  uploadManual: (formData) => api.post('/admin/settings/manuals', formData),
  
  deleteManual: (id) => 
    api.delete(`/admin/settings/manuals/${id}`),
  
  // Notificações
  getNotificationConfig: () => 
    api.get('/admin/settings/notifications'),
  
  updateNotificationConfig: (config) => 
    api.put('/admin/settings/notifications', config),

  // Contatos WhatsApp
  listWhatsappContacts: () => 
    api.get('/admin/settings/whatsapp-contacts'),
  
  addWhatsappContact: (data) => 
    api.post('/admin/settings/whatsapp-contacts', data),
  
  deleteWhatsappContact: (id) => 
    api.delete(`/admin/settings/whatsapp-contacts/${id}`),

  // Visibilidade do Dashboard (apenas Diretor)
  getDashboardVisibilityConfigs: () => 
    api.get('/admin/settings/dashboard-visibility'),
  
  saveDashboardVisibility: (level, sections) => 
    api.put(`/admin/settings/dashboard-visibility/${level}`, { sections })
};

export default api;
