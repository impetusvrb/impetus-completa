/**
 * API SERVICE
 * Gerenciamento de todas as chamadas à API do backend
 * Inclui: timeout, retry com backoff, tratamento de erros
 */

import axios from 'axios';

/**
 * Base da API. O Express monta rotas em /api/... — se VITE_API_URL for absoluto sem /api
 * (ex.: http://72.61.221.152:4000), todas as chamadas viram 404.
 */
function normalizeApiBase(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return '/api';
  const t = String(raw).trim().replace(/\/$/, '');
  if (t === '/api') return '/api';
  if (t.endsWith('/api')) return t;
  if (/^https?:\/\//i.test(t)) return `${t}/api`;
  return t;
}

const API_URL = normalizeApiBase(import.meta.env.VITE_API_URL);
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

    // Nunca fazer retry em erros de autenticação/autorização
    if (error.response?.status === 401 || error.response?.status === 403) {
      return handleFinalError(error);
    }

    const retryCount = config.__retryCount ?? 0;
    const noRetryBody = config.data instanceof FormData;
    const isRetryable =
      !noRetryBody &&
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
  const urlPath = error.config?.url || '';

  // 401 em Pró-Ação/login não deve derrubar toda a sessão do usuário.
  // Em /auth/login precisamos devolver a mensagem de erro na própria tela.
  const isProacaoRequest = urlPath.includes('/proacao');
  const isLoginRequest = urlPath.includes('/auth/login');

  if (error.response?.status === 401 && !isProacaoRequest && !isLoginRequest) {
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

/** NexusIA — custos de tokens (admin da empresa); sem detalhe por API */
export const nexusIA = {
  getCustos: (params) => api.get('/admin/nexus-custos', { params })
};

/** NexusIA — carteira de créditos, recargas (Stripe), taxas por serviço */
export const nexusWallet = {
  getDashboard: (params) => api.get('/admin/nexus-wallet', { params }),
  updateSettings: (data) => api.patch('/admin/nexus-wallet/settings', data),
  checkoutStripe: (data) => api.post('/admin/nexus-wallet/checkout/stripe', data),
  checkoutPagSeguro: (data) => api.post('/admin/nexus-wallet/checkout/pagseguro', data),
  upsertRate: (servico, credits_per_unit) =>
    api.put(`/admin/nexus-wallet/rates/${encodeURIComponent(servico)}`, { credits_per_unit }),
  deleteRate: (servico) => api.delete(`/admin/nexus-wallet/rates/${encodeURIComponent(servico)}`)
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
// REALTIME PRESENCE ENGINE (percepção + comando de render Akool)
// ============================================================================

export const realtimePresence = {
  perceive: (body) => api.post('/realtime-presence/perceive', body),
  render: (body) => api.post('/realtime-presence/render', body),
  session: (body) => api.post('/realtime-presence/session', body)
};

// ============================================================================
// DASHBOARD
// ============================================================================

export const dashboard = {
  /** Dashboard inteligente - payload completo personalizado por perfil */
  getMe: () => api.get('/dashboard/me'),
  /** Layout personalizado (perfil, modulos, assistente_ia, layout, layout_rules_version para telemetria/debug) */
  getPersonalizado: () => api.get('/dashboard/personalizado'),
  /** Painel vivo dinamico orientado a eventos */
  getLiveSurface: () => api.get('/dashboard/live-surface'),
  getConfig: () => api.get('/dashboard/config'),
  savePreferences: (data) => api.post('/dashboard/preferences', data),
  saveFavoriteKpis: (favorite_kpis) => api.post('/dashboard/favorite-kpis', { favorite_kpis }),
  trackInteraction: (event_type, entity_type, entity_id, context) =>
    api.post('/dashboard/track-interaction', { event_type, entity_type, entity_id, context }),
  /** Painel de comando visual (IA + dados reais, permissões no servidor) */
  runPanelCommand: (command) => api.post('/dashboard/panel-command', { command }),
  /** Painel visual pós-voz (Claude): transcrição utilizador + resposta assistente */
  runClaudePanel: (body) =>
    api.post('/dashboard/claude-panel', {
      userTranscript: String(body?.userTranscript ?? '').slice(0, 8000),
      assistantResponse: String(body?.assistantResponse ?? '').slice(0, 8000)
    }),
  /** Preferências de perfil / IA (próprio utilizador) */
  patchProfileContext: (body) => api.patch('/dashboard/profile-context', body),
  getWidgets: () => api.get('/dashboard/widgets'),
  getDynamicLayout: () => api.get('/dashboard/dynamic-layout'),
  /** Dashboard Inteligente Dinâmico do colaborador — layout gerado por perfil */
  getColaboradorDynamicLayout: () => api.get('/dashboard/colaborador/dynamic-layout'),

  getSummary: () => 
    api.get('/dashboard/summary'),
  
  getTrend: (months = 6) => 
    api.get(`/dashboard/trend?months=${months}`),
  
  getInsights: (limit = 10, offset = 0) =>
    api.get(`/dashboard/insights?limit=${limit}&offset=${offset}`),
  
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

  chat: (message, history = [], opts = {}) =>
    api.post('/dashboard/chat', {
      message,
      history,
      ...(opts.voiceMode ? { voiceMode: true } : {}),
      ...(opts.sentimentContext ? { sentimentContext: opts.sentimentContext } : {})
    }),
  chatWithHeader: (message, history = [], headers = {}, opts = {}) =>
    api.post(
      '/dashboard/chat',
      { message, history, ...(opts.voiceMode ? { voiceMode: true } : {}) },
      { headers }
    ),
  chatMultimodal: (payload) =>
    api.post('/dashboard/chat-multimodal', payload),
  uploadChatFile: (formData) =>
    api.post('/dashboard/chat/upload-file', formData),

  /** STT — gravar áudio no cliente e enviar; retorna { ok, transcript } */
  transcribeChatAudio: (audioBlob, opts = {}) => {
    const fd = new FormData();
    fd.append('audio', audioBlob, opts.filename || 'voice.webm');
    fd.append('language', opts.language || 'pt');
    if (opts.prompt) fd.append('prompt', opts.prompt);
    return api.post('/dashboard/chat/voice/transcribe', fd);
  },

  /** Legado — preferir voz OpenAI em /dashboard/chat/voice/speak */
  gerarVoz: (texto, falar = true) =>
    api.post('/voz', { texto: texto || '', falar: !!falar }),

  getVoicePreferences: () => api.get('/dashboard/chat/voice/preferences'),
  putVoicePreferences: (body) => api.put('/dashboard/chat/voice/preferences', body),
  formatVoiceAlert: (alert_data) =>
    api.post('/dashboard/chat/voice/format-alert', { alert_data }),
  /** TTS boas-vindas SSML (variant full|short, userDisplayName, spellName opcional) */
  speakWelcome: (body = {}) =>
    api.post('/dashboard/chat/voice/welcome', body, { responseType: 'arraybuffer' }),

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
    getPreventivesBoard: () => api.get('/dashboard/maintenance/preventives-board'),
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
  },

  forecasting: {
    getProjections: (metric) => api.get('/dashboard/forecasting/projections', { params: { metric: metric || 'eficiencia' } }),
    getAlerts: (limit) => api.get('/dashboard/forecasting/alerts', { params: { limit: limit || 15 } }),
    getSimulation: (hours) => api.get('/dashboard/forecasting/simulation', { params: { hours: hours || 48 } }),
    getHealth: () => api.get('/dashboard/forecasting/health'),
    ask: (question) => api.post('/dashboard/forecasting/ask', { question }),
    getExtendedProjections: () => api.get('/dashboard/forecasting/extended-projections'),
    getProfitLoss: (days) => api.get('/dashboard/forecasting/profit-loss', { params: { days: days || 14 } }),
    getCriticalFactors: () => api.get('/dashboard/forecasting/critical-factors'),
    simulateDecision: (action, value) => api.post('/dashboard/forecasting/simulate-decision', { action, value }),
    getConfig: () => api.get('/dashboard/forecasting/config'),
    updateConfig: (data) => api.put('/dashboard/forecasting/config', data)
  },
  costs: {
    getExecutiveSummary: () => api.get('/dashboard/costs/executive-summary'),
    getByOrigin: () => api.get('/dashboard/costs/by-origin'),
    getTopLoss: () => api.get('/dashboard/costs/top-loss'),
    getProjectedLoss: () => api.get('/dashboard/costs/projected-loss'),
    listItems: () => api.get('/dashboard/costs/items'),
    createItem: (data) => api.post('/dashboard/costs/items', data),
    updateItem: (id, data) => api.put(`/dashboard/costs/items/${id}`, data),
    deleteItem: (id) => api.delete(`/dashboard/costs/items/${id}`)
  },
  financialLeakage: {
    getMap: () => api.get('/dashboard/financial-leakage/map'),
    getRanking: () => api.get('/dashboard/financial-leakage/ranking'),
    getAlerts: () => api.get('/dashboard/financial-leakage/alerts'),
    getReport: () => api.get('/dashboard/financial-leakage/report'),
    getProjectedImpact: () => api.get('/dashboard/financial-leakage/projected-impact')
  }
};

// ============================================================================
// DASHBOARD VIVO (IA + orquestração — backend valida cargo)
// ============================================================================

export const liveDashboard = {
  getState: () => api.get('/live-dashboard/state'),
  listSnapshots: (limit) => api.get('/live-dashboard/snapshots', { params: { limit } }),
  getSnapshotAt: (at) => api.get('/live-dashboard/snapshot-at', { params: { at } }),
  executeOrchestration: (body) => api.post('/live-dashboard/orchestration/execute', body)
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
  list: (params = {}) =>
    api.get('/proacao', { params }),
  
  getById: (id) => 
    api.get(`/proacao/${id}`),
  
  create: (data) => 
    api.post('/proacao', data),

  update: (id, data) =>
    api.put(`/proacao/${id}`, data),

  updateStatus: (id, status, comment) =>
    api.patch(`/proacao/${id}/status`, { status, comment }),
  
  evaluate: (id) => 
    api.post(`/proacao/${id}/evaluate`),

  enrich: (id) =>
    api.post(`/proacao/${id}/enrich`),
  
  escalate: (id, comment, escalatedBy) => 
    api.post(`/proacao/${id}/escalate`, { comment, escalated_by: escalatedBy }),
  
  assign: (id, adminSector, assignedBy, team) => 
    api.post(`/proacao/${id}/assign`, { admin_sector: adminSector, assigned_by: assignedBy, team }),
  
  recordPhaseData: (id, phaseNumber, collectedData, userId) => 
    api.post(`/proacao/${id}/record`, { phaseNumber, collectedData, userId }),
  
  finalize: (id, finalReport, closedBy) => 
    api.post(`/proacao/${id}/finalize`, { finalReport, closedBy })
};

/** Formulário TPM (perdas antes/durante/depois da manutenção) — Pró-Ação */
export const tpm = {
  listIncidents: (params) => api.get('/tpm/incidents', { params }),
  createIncident: (data) => api.post('/tpm/incidents', data),
  getShiftTotals: (params) => api.get('/tpm/shift-totals', { params })
};

/** Impetus Pulse — autoavaliação, RH e agregados de gestão */
export const pulse = {
  getAdminSettings: () => api.get('/pulse/admin/settings'),
  putAdminSettings: (body) => api.put('/pulse/admin/settings', body),
  getMePrompt: () => api.get('/pulse/me/prompt'),
  startMe: () => api.post('/pulse/me/start', {}),
  submitMe: (body) => api.post('/pulse/me/submit', body),
  getMotivation: () => api.get('/pulse/me/motivation'),
  getSupervisorPending: () => api.get('/pulse/supervisor/pending'),
  postSupervisorPerception: (evaluationId, perception) =>
    api.post(`/pulse/supervisor/${evaluationId}/perception`, { perception }),
  hrAnalytics: (params) => api.get('/pulse/hr/analytics', { params }),
  hrCompanySettings: () => api.get('/pulse/hr/company-settings'),
  hrListEvaluations: (params) => api.get('/pulse/hr/evaluations', { params }),
  hrTrigger: (body) => api.post('/pulse/hr/trigger', body),
  hrReport: (evaluationId) => api.post(`/pulse/hr/report/${evaluationId}`, {}),
  hrListCampaigns: () => api.get('/pulse/hr/campaigns'),
  hrCreateCampaign: (body) => api.post('/pulse/hr/campaigns', body),
  mgmtAggregates: (params) => api.get('/pulse/mgmt/aggregates', { params })
};

// ============================================================================
// MANUIA - Manutenção assistida por IA (perfis de manutenção)
// ============================================================================

export const manutencaoIa = {
  getMachines: () => api.get('/manutencao-ia/machines'),
  getMachine: (id) => api.get(`/manutencao-ia/machines/${id}`),
  getDiagnostic: (id) => api.get(`/manutencao-ia/machines/${id}/diagnostic`),
  getSensors: (machineId) =>
    api.get('/manutencao-ia/sensors', { params: machineId ? { machine_id: machineId } : {} }),
  getSessions: () => api.get('/manutencao-ia/sessions'),
  createSession: (data) => api.post('/manutencao-ia/sessions', data),
  getEmergencyEvents: () => api.get('/manutencao-ia/emergency-events'),
  getHealth: () => api.get('/manutencao-ia/health'),
  /** Pesquisa equipamento por texto - IA retorna JSON estruturado para render 3D */
  researchEquipment: (query, sessionId) =>
    api.post('/manutencao-ia/research-equipment', { query, session_id: sessionId || null }),
  /** Últimas pesquisas para sugestões no campo de busca */
  getRecentSearches: (limit = 10) =>
    api.get('/manutencao-ia/research-equipment/recent', { params: { limit } }),
  /** Concluir sessão: gera OS e opcionalmente cadastra equipamento */
  concludeSession: (data) => api.post('/manutencao-ia/conclude-session', data),
  /** Assistência técnica ao vivo (câmera + dossiê + copiloto) */
  liveAnalyzeFrame: (body) => api.post('/manutencao-ia/live-assistance/analyze-frame', body),
  liveChat: (body) => api.post('/manutencao-ia/live-assistance/chat', body),
  liveSaveSession: (body) => api.post('/manutencao-ia/live-assistance/save-session', body)
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
// INTEGRAÇÕES (MES/ERP, Edge, Digital Twin)
// ============================================================================

export const integrations = {
  listConnectors: () => api.get('/integrations/mes-erp/connectors'),
  createConnector: (data) => api.post('/integrations/mes-erp/connectors', data),
  updateConnector: (id, data) => api.put(`/integrations/mes-erp/connectors/${id}`, data),
  testConnector: (id) => api.post(`/integrations/mes-erp/connectors/${id}/test`),
  listConnectorLogs: (id, limit = 50) => api.get(`/integrations/mes-erp/connectors/${id}/logs`, { params: { limit } }),
  registerEdge: (data) => api.post('/integrations/edge/register', data),
  listEdgeAgents: () => api.get('/integrations/edge/agents'),
  revokeEdgeAgent: (id) => api.post(`/integrations/edge/agents/${id}/revoke`),
  getDigitalTwinState: () => api.get('/integrations/digital-twin/state'),
  saveDigitalTwinLayout: (data) => api.put('/integrations/digital-twin/layout', data)
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

export const adminOperationalTeams = {
  list: () => api.get('/admin/operational-teams'),
  get: (id) => api.get(`/admin/operational-teams/${id}`),
  create: (data) => api.post('/admin/operational-teams', data),
  update: (id, data) => api.put(`/admin/operational-teams/${id}`, data),
  createMember: (teamId, data) => api.post(`/admin/operational-teams/${teamId}/members`, data),
  updateMember: (teamId, memberId, data) =>
    api.put(`/admin/operational-teams/${teamId}/members/${memberId}`, data),
  deleteMember: (teamId, memberId) =>
    api.delete(`/admin/operational-teams/${teamId}/members/${memberId}`),
  createCollectiveUser: (teamId, data) =>
    api.post(`/admin/operational-teams/${teamId}/collective-user`, data),
  memberActivityReport: (days = 30) =>
    api.get('/admin/operational-teams/reports/member-activity', { params: { days } }),
  healthAlerts: () => api.get('/admin/operational-teams/health/alerts'),
  teamActivityReport: (days = 30, teamId = null) =>
    api.get('/admin/operational-teams/reports/team-activity', {
      params: { days, ...(teamId ? { team_id: teamId } : {}) }
    }),
  downloadMemberEventsCsv: async (days = 30) => {
    const downloadBlob = (res) => {
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `impetus-equipes-eventos-${days}d.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    };
    try {
      const res = await api.get('/admin/operational-teams/exports/member-events.csv', {
        params: { days },
        responseType: 'blob'
      });
      downloadBlob(res);
    } catch (e) {
      if (e.response?.status === 404) {
        const res = await api.get('/admin/operational-teams/exports/member-events', {
          params: { days },
          responseType: 'blob'
        });
        downloadBlob(res);
        return;
      }
      throw e;
    }
  }
};

export const factoryTeam = {
  getContext: () => api.get('/factory-team/context'),
  setMember: (memberId) => api.post('/factory-team/session/member', { member_id: memberId }),
  useSuggested: () => api.post('/factory-team/session/member/suggested'),
  confirmContinue: () => api.post('/factory-team/session/member/confirm-continue')
};

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
// CONTA DO USUÁRIO (perfil, segurança, notificações do app, sessões)
// ============================================================================

/** Base da API de conta: sob /api/usuarios (sempre montada) — evita 404 se /api/me não estiver no app.js em produção. */
const ACCT = '/usuarios/conta';

export const meAccount = {
  get: () => api.get(`${ACCT}/account`),
  patchProfile: (body) => api.patch(`${ACCT}/account/profile`, body),
  deleteAvatar: () => api.delete(`${ACCT}/account/avatar`),
  uploadPhoto: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.put('/usuarios/foto', fd);
  },
  changePassword: (body) => api.post(`${ACCT}/account/password`, body),
  sendVerifyCode: (channel) => api.post(`${ACCT}/account/verify/send`, { channel }),
  confirmVerifyCode: (channel, code) => api.post(`${ACCT}/account/verify/confirm`, { channel, code }),
  patchNotifications: (body) => api.patch(`${ACCT}/account/notifications`, body),
  patchUi: (body) => api.patch(`${ACCT}/account/ui`, body),
  getSessions: () => api.get(`${ACCT}/account/sessions`),
  deleteSession: (sessionId) => api.delete(`${ACCT}/account/sessions/${sessionId}`),
  revokeOtherSessions: () => api.post(`${ACCT}/account/sessions/revoke-others`)
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

const structuralProductionLinesApi = {
  list: () => api.get('/admin/structural/production-lines'),
  getOne: (id) => api.get(`/admin/structural/production-lines/${id}`),
  create: (data) => api.post('/admin/structural/production-lines', data),
  update: (id, data) => api.put(`/admin/structural/production-lines/${id}`, data),
  delete: (id) => api.delete(`/admin/structural/production-lines/${id}`),
  addMachine: (lineId, data) => api.post(`/admin/structural/production-lines/${lineId}/machines`, data),
  updateMachine: (lineId, machineId, data) =>
    api.put(`/admin/structural/production-lines/${lineId}/machines/${machineId}`, data),
  deleteMachine: (lineId, machineId) =>
    api.delete(`/admin/structural/production-lines/${lineId}/machines/${machineId}`)
};

export const adminStructural = {
  getReferences: () => api.get('/admin/structural/references'),

  // Dados da empresa
  getCompanyData: () => api.get('/admin/structural/company-data'),
  updateCompanyData: (data) => api.put('/admin/structural/company-data', data),

  // Demais módulos usam CRUD genérico abaixo
  roles: {
    list: () => api.get('/admin/structural/roles'),
    create: (data) => api.post('/admin/structural/roles', data),
    update: (id, data) => api.put(`/admin/structural/roles/${id}`, data),
    delete: (id) => api.delete(`/admin/structural/roles/${id}`)
  },
  lines: structuralProductionLinesApi,
  /** Alias para a UI da Base Estrutural (mesmo método que `lines`) */
  productionLines: structuralProductionLinesApi,
  assets: {
    list: () => api.get('/admin/structural/assets'),
    create: (data) => api.post('/admin/structural/assets', data),
    update: (id, data) => api.put(`/admin/structural/assets/${id}`, data),
    delete: (id) => api.delete(`/admin/structural/assets/${id}`)
  },
  processes: {
    list: () => api.get('/admin/structural/processes'),
    create: (data) => api.post('/admin/structural/processes', data),
    update: (id, data) => api.put(`/admin/structural/processes/${id}`, data),
    delete: (id) => api.delete(`/admin/structural/processes/${id}`)
  },
  products: {
    list: () => api.get('/admin/structural/products'),
    create: (data) => api.post('/admin/structural/products', data),
    update: (id, data) => api.put(`/admin/structural/products/${id}`, data),
    delete: (id) => api.delete(`/admin/structural/products/${id}`)
  },
  indicators: {
    list: () => api.get('/admin/structural/indicators'),
    create: (data) => api.post('/admin/structural/indicators', data),
    update: (id, data) => api.put(`/admin/structural/indicators/${id}`, data),
    delete: (id) => api.delete(`/admin/structural/indicators/${id}`)
  },
  failureRisks: {
    list: () => api.get('/admin/structural/failure-risks'),
    create: (data) => api.post('/admin/structural/failure-risks', data),
    update: (id, data) => api.put(`/admin/structural/failure-risks/${id}`, data),
    delete: (id) => api.delete(`/admin/structural/failure-risks/${id}`)
  },
  communicationRules: {
    list: () => api.get('/admin/structural/communication-rules'),
    create: (data) => api.post('/admin/structural/communication-rules', data),
    update: (id, data) => api.put(`/admin/structural/communication-rules/${id}`, data),
    delete: (id) => api.delete(`/admin/structural/communication-rules/${id}`)
  },
  routines: {
    list: () => api.get('/admin/structural/routines'),
    create: (data) => api.post('/admin/structural/routines', data),
    update: (id, data) => api.put(`/admin/structural/routines/${id}`, data),
    delete: (id) => api.delete(`/admin/structural/routines/${id}`)
  },
  shifts: {
    list: () => api.get('/admin/structural/shifts'),
    create: (data) => api.post('/admin/structural/shifts', data),
    update: (id, data) => api.put(`/admin/structural/shifts/${id}`, data),
    delete: (id) => api.delete(`/admin/structural/shifts/${id}`)
  },
  areaResponsibles: {
    list: () => api.get('/admin/structural/area-responsibles'),
    create: (data) => api.post('/admin/structural/area-responsibles', data),
    update: (id, data) => api.put(`/admin/structural/area-responsibles/${id}`, data),
    delete: (id) => api.delete(`/admin/structural/area-responsibles/${id}`)
  },
  aiConfig: {
    list: () => api.get('/admin/structural/ai-config'),
    create: (data) => api.post('/admin/structural/ai-config', data),
    update: (id, data) => api.put(`/admin/structural/ai-config/${id}`, data),
    delete: (id) => api.delete(`/admin/structural/ai-config/${id}`)
  },
  knowledgeDocuments: {
    list: () => api.get('/admin/structural/knowledge-documents'),
    create: (data) => api.post('/admin/structural/knowledge-documents', data),
    update: (id, data) => api.put(`/admin/structural/knowledge-documents/${id}`, data),
    delete: (id) => api.delete(`/admin/structural/knowledge-documents/${id}`)
  }
};

export const intelligentRegistration = {
  getAll: (params) => api.get('/intelligent-registration', { params }),
  /** Alias de getAll */
  list: (params) => api.get('/intelligent-registration', { params }),
  create: (data) =>
    api.post(
      '/intelligent-registration',
      typeof data === 'string' ? { text: data } : data
    ),
  /** Registos de toda a empresa (hierarchy ≤ 2 no backend) */
  leadership: (params) => api.get('/intelligent-registration/leadership', { params }),
  update: (id, data) => api.put(`/intelligent-registration/${id}`, data),
  remove: (id) => api.delete(`/intelligent-registration/${id}`),
};

/** Almoxarifado Inteligente — painel IA (backend: /api/admin/warehouse/intelligence/*) */
export const warehouseIntelligence = {
  getDashboard: () => api.get('/admin/warehouse/intelligence/dashboard'),
  acknowledgeAlert: (id) => api.post(`/admin/warehouse/intelligence/alerts/${id}/ack`),
  runAlerts: () => api.post('/admin/warehouse/intelligence/run-alerts')
};

export const logisticsIntelligence = {
  getDashboard: () => api.get('/admin/logistics/intelligence/dashboard'),
  acknowledgeAlert: (id) => api.post(`/admin/logistics/intelligence/alerts/${id}/ack`),
  runAlerts: () => api.post('/admin/logistics/intelligence/run-alerts')
};

/** Biblioteca técnica de equipamentos — backend exige role admin + company_id */
export const equipmentLibraryAdmin = {
  health: () => api.get('/admin/equipment-library/health'),
  references: () => api.get('/admin/equipment-library/references'),
  assets: {
    list: () => api.get('/admin/equipment-library/assets'),
    get: (id) => api.get(`/admin/equipment-library/assets/${id}`),
    create: (data) => api.post('/admin/equipment-library/assets', data),
    update: (id, data) => api.put(`/admin/equipment-library/assets/${id}`, data),
    delete: (id) => api.delete(`/admin/equipment-library/assets/${id}`),
    uploadModel3d: (id, file, opts) => {
      const fd = new FormData();
      fd.append('file', file);
      if (opts?.is_primary) fd.append('is_primary', 'true');
      return api.post(`/admin/equipment-library/assets/${id}/model-3d`, fd);
    },
    uploadManualPdf: (id, file) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post(`/admin/equipment-library/assets/${id}/manual-pdf`, fd);
    }
  },
  knowledgeDocuments: {
    list: () => api.get('/admin/equipment-library/knowledge-documents'),
    create: (data) => api.post('/admin/equipment-library/knowledge-documents', data),
    update: (id, data) => api.put(`/admin/equipment-library/knowledge-documents/${id}`, data),
    delete: (id) => api.delete(`/admin/equipment-library/knowledge-documents/${id}`)
  },
  spareParts: {
    list: () => api.get('/admin/equipment-library/spare-parts'),
    upsert: (data) => api.post('/admin/equipment-library/spare-parts', data),
    updateKeywords: (id, keywords) =>
      api.patch(`/admin/equipment-library/spare-parts/${id}/keywords`, { keywords }),
    validateAi: (id) => api.patch(`/admin/equipment-library/spare-parts/${id}/validate-ai`),
    importCsv: (file) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post('/admin/equipment-library/spare-parts/import-csv', fd);
    }
  },
  /** Catálogo 3D versionado (equipamento ou peça) */
  models3d: {
    list: (params) => api.get('/admin/equipment-library/technical-3d-models', { params }),
    upload: (file, fields) => {
      const fd = new FormData();
      fd.append('file', file);
      if (fields?.asset_id) fd.append('asset_id', fields.asset_id);
      if (fields?.spare_part_id) fd.append('spare_part_id', fields.spare_part_id);
      if (fields?.version_label) fd.append('version_label', fields.version_label);
      if (fields?.notes) fd.append('notes', fields.notes);
      if (fields?.is_primary) fd.append('is_primary', 'true');
      return api.post('/admin/equipment-library/technical-3d-models', fd);
    },
    update: (id, data) => api.patch(`/admin/equipment-library/technical-3d-models/${id}`, data),
    delete: (id) => api.delete(`/admin/equipment-library/technical-3d-models/${id}`)
  }
};

/** Biblioteca Técnica Inteligente — Central técnica de ativos 3D (ManuIA), admin + company_id */
export const technicalLibrary = {
  health: () => api.get('/technical-library/health'),
  listEquipments: (params) => api.get('/technical-library/equipments', { params }),
  getEquipment: (id) => api.get(`/technical-library/equipments/${id}`),
  createEquipment: (data) => api.post('/technical-library/equipments', data),
  updateEquipment: (id, data) => api.put(`/technical-library/equipments/${id}`, data),
  deleteEquipment: (id) => api.delete(`/technical-library/equipments/${id}`),
  postKeywords: (equipmentId, body) => api.post(`/technical-library/equipments/${equipmentId}/keywords`, body),
  deleteKeyword: (keywordId) => api.delete(`/technical-library/keywords/${keywordId}`),
  uploadModel: (equipmentId, file, fields) => {
    const fd = new FormData();
    fd.append('file', file);
    if (fields) {
      Object.keys(fields).forEach((k) => {
        if (fields[k] != null && fields[k] !== '') fd.append(k, fields[k]);
      });
    }
    return api.post(`/technical-library/equipments/${equipmentId}/models`, fd);
  },
  patchModel: (modelId, data) => api.patch(`/technical-library/models/${modelId}`, data),
  setPrimaryModel: (modelId) => api.patch(`/technical-library/models/${modelId}/set-primary`),
  deleteModel: (modelId) => api.delete(`/technical-library/models/${modelId}`),
  uploadDocument: (equipmentId, file, fields) => {
    const fd = new FormData();
    fd.append('file', file);
    if (fields) {
      Object.keys(fields).forEach((k) => {
        if (fields[k] != null && fields[k] !== '') fd.append(k, fields[k]);
      });
    }
    return api.post(`/technical-library/equipments/${equipmentId}/documents`, fd);
  },
  deleteDocument: (documentId) => api.delete(`/technical-library/documents/${documentId}`),
  createPart: (equipmentId, data) => api.post(`/technical-library/equipments/${equipmentId}/parts`, data),
  updatePart: (partId, data) => api.put(`/technical-library/parts/${partId}`, data),
  deletePart: (partId) => api.delete(`/technical-library/parts/${partId}`),
  importCsv: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/technical-library/import/csv', fd);
  },
  buildUnityPayload: (equipmentId) => api.post(`/technical-library/equipments/${equipmentId}/build-unity-payload`),
  buildProceduralPayload: (equipmentId) => api.post(`/technical-library/equipments/${equipmentId}/build-procedural-payload`),
  testResolve: (body) => api.post('/technical-library/resolve/test', body),
  listAudit: (params) => api.get('/technical-library/audit', { params }),
  /** Análise de campo (foto/vídeo) — utilizador com empresa (não exige admin) */
  fieldAnalysis: {
    create: (formData) =>
      api.post('/technical-library/field-analysis', formData, {
        timeout: 300000
      }),
    get: (id) => api.get(`/technical-library/field-analysis/${id}`)
  },
  /** Payload visual unificado (alarme ou resultado IA) → contrato Unity */
  buildUnityVisualPayload: (body) => api.post('/technical-library/unity/build-visual-payload', body)
};