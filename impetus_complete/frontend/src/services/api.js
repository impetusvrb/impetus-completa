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
    // FormData exige boundary automático — json default quebrava /voz/transcrever e uploads
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
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

    // Nunca fazer retry em erros de autenticação/autorização (exceto /voz: não deslogar, só falhar)
    const isVoz = (config.url || '').includes('/voz');
    if (error.response?.status === 401 || error.response?.status === 403) {
      if (isVoz) return Promise.reject(error);
      return handleFinalError(error);
    }

    const retryCount = config.__retryCount ?? 0;
    const isFormOrUpload =
      config.data instanceof FormData || String(config.url || '').includes('/transcrever');
    const isRetryable =
      !isFormOrUpload &&
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
  const isVoz = (error.config?.url || '').includes('/voz');
  if (error.response?.status === 401 && !isVoz) {
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
  } else if (error.response?.status === 403 && /^INDUSTRIAL_/.test(error.response?.data?.code || '')) {
    error.apiMessage = error.response?.data?.error || 'Permissão insuficiente para esta ação no módulo Integração Industrial.';
  } else if (error.response?.status === 403 && error.response?.data?.code === 'ROLE_VERIFICATION_REQUIRED') {
    error.apiMessage = error.response?.data?.error || 'Valide seu cargo para acessar dados estratégicos.';
    error.needsRoleVerification = true;
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/validacao-cargo')) {
      window.location.href = '/validacao-cargo';
    }
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

// App Impetus - Canal de comunicação unificado
export const appImpetus = {
  getStatus: () => api.get('/app-impetus/status'),
  getOutbox: (since) => api.get('/app-impetus/outbox', { params: since ? { since } : {} }),
  sendMessage: (data) => api.post('/app-impetus/messages', data)
};

// App Communications - mensagens com mídia (áudio, vídeo) do App Mobile/PWA
export const appCommunications = {
  list: (limit = 30, offset = 0) =>
    api.get('/app-communications', { params: { limit, offset } }),
  send: (formData) =>
    api.post('/app-communications', formData)
};

// ============================================================================
// AUTENTICAÇÃO
// ============================================================================

export const auth = {
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  verifyPassword: (password) => api.post('/auth/verify-password', { password }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
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
// VALIDAÇÃO HIERÁRQUICA DE CARGOS
// ============================================================================

export const roleVerification = {
  getStatus: () => api.get('/role-verification/status'),
  checkEmail: () => api.get('/role-verification/check-email'),
  verifyByEmail: () => api.post('/role-verification/verify-email'),
  requestApproval: () => api.post('/role-verification/request-approval'),
  getPendingApprovals: () => api.get('/role-verification/pending-approvals'),
  approveRequest: (requestId, approved, rejectionReason) =>
    api.post(`/role-verification/approve/${requestId}`, { approved, rejection_reason: rejectionReason }),
  uploadDocument: (formData) => api.post('/role-verification/upload-document', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getPanel: () => api.get('/role-verification/panel')
};

// ============================================================================
// DASHBOARD
// ============================================================================

export const dashboard = {
  /** Dashboard inteligente - payload completo personalizado por perfil */
  getMe: () => api.get('/dashboard/me'),
  getConfig: () => api.get('/dashboard/config'),
  savePreferences: (data) => api.post('/dashboard/preferences', data),
  saveFavoriteKpis: (favorite_kpis) => api.post('/dashboard/favorite-kpis', { favorite_kpis }),
  trackInteraction: (event_type, entity_type, entity_id, context) =>
    api.post('/dashboard/track-interaction', { event_type, entity_type, entity_id, context }),
  getWidgets: () => api.get('/dashboard/widgets'),

  getOnboardingStatus: () => api.get('/dashboard/onboarding-status'),
  saveOnboarding: (answers) => api.post('/dashboard/onboarding', { answers }),

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
  chatWithHeader: (message, history = [], headers = {}) =>
    api.post('/dashboard/chat', { message, history }, { headers }),
  chatMultimodal: (payload) =>
    api.post('/dashboard/chat-multimodal', payload),
  uploadChatFile: (formData) =>
    api.post('/dashboard/chat/upload-file', formData),

  /** TTS via backend (OpenAI). Só gera áudio quando falar=true. */
  gerarVoz: (texto, falar = true) =>
    api.post('/voz', { texto: texto || '', falar: !!falar }),

  /** Comando de voz (regra simples) - retorna texto e opcionalmente áudio */
  comandoVoz: (comando, falar = false) =>
    api.post('/voz/comando', { comando: comando || '', falar: !!falar }),

  /** Modo conversa Impetus IA: memória + GPT + TTS */
  vozConversa: (message, reset = false, falar = true) =>
    api.post('/voz/conversa', {
      message: message || '',
      reset: !!reset,
      falar: !!falar
    }),

  vozConversaReset: () =>
    api.post('/voz/conversa', { message: '', reset: true, falar: false }),

  /** Gravação webm → texto (Whisper), para quando Web Speech não funciona */
  transcreverVoz: (formData) =>
    api.post('/voz/transcrever', formData, {
      timeout: 90000,
      maxContentLength: 15 * 1024 * 1024,
      maxBodyLength: 15 * 1024 * 1024
    }),

  logActivity: (data) => 
    api.post('/dashboard/log-activity', data),

  getVisibility: () => 
    api.get('/dashboard/visibility'),

  getUserContext: () =>
    api.get('/dashboard/user-context'),

  executiveQuery: (query, modoApresentacao = false) =>
    api.post('/dashboard/executive-query', { query, modoApresentacao }),

  orgAIAssistant: (question) =>
    api.post('/dashboard/org-ai-assistant', { question }),

  // Dashboard operacional manutenção (perfil mecânico)
  maintenance: {
    getSummary: () => api.get('/dashboard/maintenance/summary'),
    getCards: () => api.get('/dashboard/maintenance/cards'),
    getMyTasks: () => api.get('/dashboard/maintenance/my-tasks'),
    getMachinesAttention: () => api.get('/dashboard/maintenance/machines-attention'),
    getInterventions: () => api.get('/dashboard/maintenance/interventions'),
    getPreventives: () => api.get('/dashboard/maintenance/preventives'),
    getRecurringFailures: () => api.get('/dashboard/maintenance/recurring-failures')
  },

  // Cadastrar com IA - upload multimodal (texto, imagem, documento, áudio)
  cadastrarComIA: {
    cadastrar: (formData) => api.post('/cadastrar-com-ia', formData),
    listar: (categoria, limit) => api.get('/cadastrar-com-ia', { params: { categoria, limit } })
  },

  // Cérebro Operacional - Painel de Inteligência Operacional
  operationalBrain: {
    getSummary: (params) => api.get('/dashboard/operational-brain/summary', { params }),
    getKnowledgeMap: () => api.get('/dashboard/operational-brain/knowledge-map'),
    getInsights: (params) => api.get('/dashboard/operational-brain/insights', { params }),
    markInsightRead: (id) => api.post(`/dashboard/operational-brain/insights/${id}/read`),
    getAlerts: (params) => api.get('/dashboard/operational-brain/alerts', { params }),
    resolveAlert: (id) => api.post(`/dashboard/operational-brain/alerts/${id}/resolve`),
    getTimeline: (params) => api.get('/dashboard/operational-brain/timeline', { params }),
    checkAlerts: () => api.post('/dashboard/operational-brain/check-alerts')
  },

  industrial: {
    getStatus: () => api.get('/dashboard/industrial/status'),
    getEvents: (params) => api.get('/dashboard/industrial/events', { params }),
    getProfiles: () => api.get('/dashboard/industrial/profiles'),
    getAutomation: () => api.get('/dashboard/industrial/automation'),
    setAutomation: (mode) => api.post('/dashboard/industrial/automation', { mode }),
    sendCommand: (data) => api.post('/dashboard/industrial/command', data),
    getMachines: () => api.get('/dashboard/industrial/machines'),
    addMachine: (data) => api.post('/dashboard/industrial/machines', data),
    updateMachine: (id, data) => api.put(`/dashboard/industrial/machines/${id}`, data),
    deleteMachine: (id) => api.delete(`/dashboard/industrial/machines/${id}`)
  }
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

/** ManuIA App de extensão (PWA / mobile) — preferências, inbox, OS, dashboard */
export const manuiaApp = {
  getPreferences: () => api.get('/manutencao-ia/app/preferences'),
  putPreferences: (data) => api.put('/manutencao-ia/app/preferences', data),
  registerDevice: (body) => api.post('/manutencao-ia/app/devices', body),
  getInbox: (params) => api.get('/manutencao-ia/app/inbox', { params }),
  getInboxItem: (id) => api.get(`/manutencao-ia/app/inbox/${id}`),
  patchInboxAttendance: (id, body) => api.patch(`/manutencao-ia/app/inbox/${id}/attendance`, body),
  escalateInbox: (id, body) => api.post(`/manutencao-ia/app/inbox/${id}/escalate`, body),
  ackInbox: (id) => api.post(`/manutencao-ia/app/inbox/${id}/ack`),
  readInbox: (id) => api.post(`/manutencao-ia/app/inbox/${id}/read`),
  getWorkOrders: (params) => api.get('/manutencao-ia/app/work-orders', { params }),
  getDashboard: () => api.get('/manutencao-ia/app/dashboard'),
  previewDecision: (body) => api.post('/manutencao-ia/app/decision/preview', body),
  notificationPreview: (body) => api.post('/manutencao-ia/app/notification-preview', body),
  getVapidPublicKey: () => api.get('/manutencao-ia/app/push/vapid-public-key'),
  pushTest: (body) => api.post('/manutencao-ia/app/push/test', body),
  listOnCallSlots: () => api.get('/manutencao-ia/app/on-call'),
  createOnCallSlot: (data) => api.post('/manutencao-ia/app/on-call', data),
  updateOnCallSlot: (id, data) => api.put(`/manutencao-ia/app/on-call/${id}`, data),
  deleteOnCallSlot: (id) => api.delete(`/manutencao-ia/app/on-call/${id}`),
  simulateIngest: (body) => api.post('/manutencao-ia/app/notifications/simulate-ingest', body)
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
    api.get('/admin/users/stats/summary'),
  
  updateProfileContext: (userId, data) =>
    api.patch(`/admin/users/${userId}/profile-context`, data)
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
  listNotificationContacts: () => 
    api.get('/admin/settings/notification-contacts'),
  
  addNotificationContact: (data) => 
    api.post('/admin/settings/notification-contacts', data),
  
  deleteNotificationContact: (id) => 
    api.delete(`/admin/settings/notification-contacts/${id}`),

  // Visibilidade do Dashboard (apenas Diretor)
  getDashboardVisibilityConfigs: () => 
    api.get('/admin/settings/dashboard-visibility'),
  
  saveDashboardVisibility: (level, sections) => 
    api.put(`/admin/settings/dashboard-visibility/${level}`, { sections })
};

export default api;

export const adminStructural = {
  getReferences: () => api.get('/admin/structural/references'),
  getAll: (module) => api.get(`/admin/structural/${module}`),
  create: (module, data) => api.post(`/admin/structural/${module}`, data),
  update: (module, id, data) => api.put(`/admin/structural/${module}/${id}`, data),
  remove: (module, id) => api.delete(`/admin/structural/${module}/${id}`),
};

export const intelligentRegistration = {
  getAll: (params) => api.get('/intelligent-registration', { params }),
  create: (data) => api.post('/intelligent-registration', data),
  update: (id, data) => api.put(`/intelligent-registration/${id}`, data),
  remove: (id) => api.delete(`/intelligent-registration/${id}`),
};