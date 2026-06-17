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

export const API_URL = normalizeApiBase(import.meta.env.VITE_API_URL);
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

// Guardar trace da última resposta do assistente (reporte de incidente / caixa-preta)
api.interceptors.response.use(
  (response) => {
    try {
      const url = String(response.config?.url || '');
      const method = String(response.config?.method || '').toLowerCase();
      if (
        method === 'post' &&
        (url.includes('/dashboard/chat') ||
          url.includes('/dashboard/chat-multimodal') ||
          url.includes('/cognitive-council/execute'))
      ) {
        const tid = response.headers?.['x-ai-trace-id'] || response.headers?.['X-AI-Trace-ID'];
        if (tid && typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('impetus_last_ai_trace_id', tid);
        }
      }
    } catch (_) {
      /* ignore */
    }
    return response;
  },
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
    import('./anamSessionSingleton')
      .then((m) => m.stopAnamStreamNow())
      .catch(() => {});
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
  getCustos: (params) => api.get('/admin/nexus-custos', { params }),
  /** Transparência de fornecedores / subprocessadores (admin da empresa) */
  getProvidersTransparency: () => api.get('/nexus-ia/providers-transparency')
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
// ANAM — avatar vídeo em tempo real (persona Anam Lab)
// ============================================================================

export const anam = {
  /** Sem JWT — só indica se ANAM_API_KEY está no servidor */
  getPublicConfig: () => api.get('/anam/public-config'),
  getConfig: () => api.get('/anam/config'),
  prepareSession: () => api.post('/anam/prepare'),
  createSessionToken: (body) => api.post('/anam/session-token', body || {})
};

// ============================================================================
// DASHBOARD
// ============================================================================

export const dashboard = {
  /** Dashboard inteligente - payload completo personalizado por perfil */
  getMe: (config = {}) => api.get('/dashboard/me', config),
  /** Contexto interno + regras de acesso (Realtime / Anam ao vivo) */
  getVoiceRealtimeContext: (params) =>
    api.get('/dashboard/voice-realtime-context', {
      params: { channel: 'anam_voice', force: '1', ...(params || {}) }
    }),
  /** FASE 34 — validação shadow de transcript de voz (não altera áudio) */
  voiceTruthShadowValidate: (body) => api.post('/dashboard/voice-truth-shadow-validate', body),
  /** Layout personalizado (perfil, modulos, assistente_ia, layout, layout_rules_version para telemetria/debug) */
  getPersonalizado: () => api.get('/dashboard/personalizado'),
  /** Painel vivo dinamico orientado a eventos */
  getLiveSurface: () => api.get('/dashboard/live-surface'),
  /** Pulso cognitivo — centro global, feed, timeline, heatmap, radar */
  getCognitivePulse: () => api.get('/dashboard/cognitive-pulse'),
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

  getChartsBundle: () => api.get('/dashboard/charts/bundle'),

  getProductionDemand: (weeks = 8) =>
    api.get(`/dashboard/charts/production-demand?weeks=${weeks}`),

  getPulseClimate: (weeks = 8) =>
    api.get(`/dashboard/charts/pulse-climate?weeks=${weeks}`),
  
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

  chat: (message, history = [], opts = {}) => {
    let last_ai_trace_id;
    try {
      last_ai_trace_id = sessionStorage.getItem('impetus_last_ai_trace_id') || undefined;
    } catch (_) {
      last_ai_trace_id = undefined;
    }
    return api.post('/dashboard/chat', {
      message,
      history,
      ...(last_ai_trace_id ? { last_ai_trace_id } : {}),
      ...(opts.voiceMode ? { voiceMode: true } : {}),
      ...(opts.sentimentContext ? { sentimentContext: opts.sentimentContext } : {}),
      ...(opts.panelContext
        ? { voice_panel_context: String(opts.panelContext).slice(0, 6000) }
        : {})
    });
  },
  chatWithHeader: (message, history = [], headers = {}, opts = {}) => {
    let last_ai_trace_id;
    try {
      last_ai_trace_id = sessionStorage.getItem('impetus_last_ai_trace_id') || undefined;
    } catch (_) {
      last_ai_trace_id = undefined;
    }
    return api.post(
      '/dashboard/chat',
      {
        message,
        history,
        ...(last_ai_trace_id ? { last_ai_trace_id } : {}),
        ...(opts.voiceMode ? { voiceMode: true } : {})
      },
      { headers }
    );
  },
  /** Confirmação de proposta system_influence (chat) — alinhado a POST /api/operational/confirm-action */
  confirmOperationalSystemInfluence: (body) => api.post('/operational/confirm-action', body),
  /** Rollback controlado — corpo { rollback_context } devolvido na confirmação */
  rollbackOperationalSystemInfluence: (body) => api.post('/operational/rollback-action', body),
  chatMultimodal: (payload = {}) => {
    let last_ai_trace_id;
    try {
      last_ai_trace_id = sessionStorage.getItem('impetus_last_ai_trace_id') || undefined;
    } catch (_) {
      last_ai_trace_id = undefined;
    }
    return api.post('/dashboard/chat-multimodal', {
      ...payload,
      ...(last_ai_trace_id ? { last_ai_trace_id } : {})
    });
  },
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

  listFunctionalAreas: () =>
    api.get('/admin/users/meta/functional-areas'),
  
  updateProfileContext: (userId, data) =>
    api.patch(`/admin/users/${userId}/profile-context`, data)
};

/** Governança administrativa do tenant (primary / secondary / recovery) */
export const tenantAdmins = {
  list: () => api.get('/admin/tenant-admins'),
  promote: (body) => api.post('/admin/tenant-admins', body),
  revoke: (id) => api.delete(`/admin/tenant-admins/${id}`)
};

// ============================================================================
// ADMINISTRAÇÃO - DEPARTAMENTOS
// ============================================================================

export const adminOperationalTeams = {
  _withFallback: async (requestPrimary, requestFallback) => {
    try {
      return await requestPrimary();
    } catch (e) {
      if (e?.response?.status !== 404 || !requestFallback) throw e;
      return requestFallback();
    }
  },
  list: () =>
    adminOperationalTeams._withFallback(
      () => api.get('/admin/operational-teams'),
      () => api.get('/admin/equipes-operacionais')
    ),
  get: (id) =>
    adminOperationalTeams._withFallback(
      () => api.get(`/admin/operational-teams/${id}`),
      () => api.get(`/admin/equipes-operacionais/${id}`)
    ),
  create: (data) =>
    adminOperationalTeams._withFallback(
      () => api.post('/admin/operational-teams', data),
      () => api.post('/admin/equipes-operacionais', data)
    ),
  update: (id, data) =>
    adminOperationalTeams._withFallback(
      () => api.put(`/admin/operational-teams/${id}`, data),
      () => api.put(`/admin/equipes-operacionais/${id}`, data)
    ),
  createMember: (teamId, data) =>
    adminOperationalTeams._withFallback(
      () => api.post(`/admin/operational-teams/${teamId}/members`, data),
      () => api.post(`/admin/equipes-operacionais/${teamId}/members`, data)
    ),
  updateMember: (teamId, memberId, data) =>
    adminOperationalTeams._withFallback(
      () => api.put(`/admin/operational-teams/${teamId}/members/${memberId}`, data),
      () => api.put(`/admin/equipes-operacionais/${teamId}/members/${memberId}`, data)
    ),
  deleteMember: (teamId, memberId) =>
    adminOperationalTeams._withFallback(
      () => api.delete(`/admin/operational-teams/${teamId}/members/${memberId}`),
      () => api.delete(`/admin/equipes-operacionais/${teamId}/members/${memberId}`)
    ),
  createCollectiveUser: (teamId, data) =>
    adminOperationalTeams._withFallback(
      () => api.post(`/admin/operational-teams/${teamId}/collective-user`, data),
      () => api.post(`/admin/equipes-operacionais/${teamId}/collective-user`, data)
    ),
  memberActivityReport: (days = 30) =>
    adminOperationalTeams._withFallback(
      () => api.get('/admin/operational-teams/reports/member-activity', { params: { days } }),
      () => api.get('/admin/equipes-operacionais/reports/member-activity', { params: { days } })
    ),
  healthAlerts: () =>
    adminOperationalTeams._withFallback(
      () => api.get('/admin/operational-teams/health/alerts'),
      () => api.get('/admin/equipes-operacionais/health/alerts')
    ),
  teamActivityReport: (days = 30, teamId = null) =>
    adminOperationalTeams._withFallback(
      () =>
        api.get('/admin/operational-teams/reports/team-activity', {
          params: { days, ...(teamId ? { team_id: teamId } : {}) }
        }),
      () =>
        api.get('/admin/equipes-operacionais/reports/team-activity', {
          params: { days, ...(teamId ? { team_id: teamId } : {}) }
        })
    ),
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
      const res = await adminOperationalTeams._withFallback(
        () =>
          api.get('/admin/operational-teams/exports/member-events.csv', {
            params: { days },
            responseType: 'blob'
          }),
        () =>
          api.get('/admin/equipes-operacionais/exports/member-events.csv', {
            params: { days },
            responseType: 'blob'
          })
      );
      downloadBlob(res);
    } catch (e) {
      if (e.response?.status === 404) {
        const res = await adminOperationalTeams._withFallback(
          () =>
            api.get('/admin/operational-teams/exports/member-events', {
              params: { days },
              responseType: 'blob'
            }),
          () =>
            api.get('/admin/equipes-operacionais/exports/member-events', {
              params: { days },
              responseType: 'blob'
            })
        );
        downloadBlob(res);
        return;
      }
      throw e;
    }
  }
};

export const factoryTeam = {
  getContext: () => api.get('/factory-team/context'),
  clearActiveMember: () => api.post('/factory-team/session/clear-active-member', {}),
  verifyOperator: (body) => api.post('/factory-team/session/verify-operator', body)
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

export const adminHelpManual = {
  getOverview: () => api.get('/admin/help-manual'),
  search: (query, limit = 20) =>
    api.get('/admin/help-manual/search', {
      params: {
        q: query || '',
        limit
      }
    })
};

/** Quality Universal — operational UX runtime (WAVE 6 + backbone events). */
export const qualityOperational = {
  health: () => api.get('/quality-operational/health'),
  publishEvent: (body) => api.post('/quality-operational/events', body)
};

/** Environment — operational UX runtime (SGA/EHS Etapa 1). */
export const environmentOperational = {
  health: () => api.get('/environment-operational/health'),
  publishEvent: (body) => api.post('/environment-operational/events', body),
  summary: (area) => api.get(`/environment-operational/workspace/${area}/summary`),
  record: (area, body) => api.post(`/environment-operational/workspace/${area}/record`, body)
};

/** Environment — governance & strategic intelligence (Etapa 2). */
export const environmentGovernance = {
  health: () => api.get('/environment-governance/health'),
  governancePack: (body) => api.post('/environment-governance/intelligence/pack', body),
  esgEvaluate: (body) => api.post('/environment-governance/intelligence/esg/evaluate', body),
  complianceScreen: (body) => api.post('/environment-governance/intelligence/compliance/screen', body),
  carbonInventory: (body) => api.post('/environment-governance/intelligence/carbon/inventory', body),
  energyEfficiency: (body) => api.post('/environment-governance/intelligence/energy/efficiency', body),
  sustainabilityMaturity: (body) => api.post('/environment-governance/intelligence/sustainability/maturity', body),
  validateGovernance: (body) => api.post('/environment-governance/validation/governance', body)
};

/** Quality — governance & intelligence (Etapa 3). */
export const qualityGovernance = {
  health: () => api.get('/quality-governance/health'),
  screenSpc: (body) => api.post('/quality-governance/intelligence/spc/screen', body),
  screenDrift: (body) => api.post('/quality-governance/intelligence/drift/screen', body),
  rankFmea: (body) => api.post('/quality-governance/intelligence/fmea/rank', body),
  analyticsPack: (body) => api.post('/quality-governance/intelligence/analytics-pack', body),
  narrative: (body) => api.post('/quality-governance/intelligence/narrative', body),
  insightPack: (body) => api.post('/quality-governance/intelligence/insight-pack', body),
  supplierScorecard: (body) => api.post('/quality-governance/intelligence/supplier/scorecard', body),
  auditExplore: (params) => api.get('/quality-governance/audit/explore', { params })
};

/** Quality — industrial telemetry runtime (Etapa 4). */
export const qualityTelemetry = {
  health: () => api.get('/quality-telemetry/health'),
  ingestV1: (body) => api.post('/quality-telemetry/ingest/v1', body),
  ingestDimensional: (body) => api.post('/quality-telemetry/ingest/dimensional', body),
  ingestBatch: (body) => api.post('/quality-telemetry/ingest/batch', body)
};

/** Environment — executive cockpit runtime (Etapa 5). */
export const environmentExecutive = {
  health: () => api.get('/environment-executive/health'),
  runCockpit: (body) => api.post('/environment-executive/cockpit/run', body),
  validationRun: () => api.get('/environment-executive/validation/run')
};

/** Environment — cognitive intelligence runtime (Etapa 4). */
export const environmentCognitive = {
  health: () => api.get('/environment-cognitive/health'),
  runInsights: (body) => api.post('/environment-cognitive/insights/run', body),
  validationRun: () => api.get('/environment-cognitive/validation/run')
};

/** Environment — industrial telemetry runtime (Etapa 3). */
export const environmentTelemetry = {
  health: () => api.get('/environment-telemetry/health'),
  ingestV1: (body) => api.post('/environment-telemetry/ingest/v1', body),
  ingestDimensional: (body) => api.post('/environment-telemetry/ingest/dimensional', body),
  ingestBatch: (body) => api.post('/environment-telemetry/ingest/batch', body),
  ingestRealtime: (body) => api.post('/environment-telemetry/ingest/realtime', body),
  edgeQueue: () => api.get('/environment-telemetry/edge/queue'),
  edgeEnqueue: (body) => api.post('/environment-telemetry/edge/enqueue', body),
  edgeSync: () => api.post('/environment-telemetry/edge/sync'),
  connectorsStatus: () => api.get('/environment-telemetry/connectors/status'),
  connectorIngest: (connector, body) => api.post(`/environment-telemetry/connectors/${connector}/ingest`, body),
  reconnect: (body) => api.post('/environment-telemetry/connectors/reconnect', body),
  validationRun: () => api.get('/environment-telemetry/validation/run')
};

/** Quality — cognitive industrial intelligence (Etapa 5). */
export const qualityCognitive = {
  health: () => api.get('/quality-cognitive/health'),
  runInsights: (body) => api.post('/quality-cognitive/insights/run', body)
};

/** Quality — controlled enterprise rollout (Etapa 6). */
export const qualityRollout = {
  health: () => api.get('/quality-rollout/health'),
  runAssessment: (body) => api.post('/quality-rollout/assessment/run', body),
  memorySnapshot: () => api.get('/quality-rollout/snapshot/memory')
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
    delete: (id) => api.delete(`/admin/structural/roles/${id}`),
    getIdentity: (id) => api.get(`/admin/structural/roles/${id}/identity`),
    previewModules: (data) => api.post('/admin/structural/roles/preview-modules', data)
  },
  sectors: {
    list: () => api.get('/admin/structural/sectors'),
    create: (data) => api.post('/admin/structural/sectors', data),
    update: (id, data) => api.put(`/admin/structural/sectors/${id}`, data),
    delete: (id) => api.delete(`/admin/structural/sectors/${id}`)
  },
  organizationalUnits: {
    list: () => api.get('/admin/structural/organizational-units'),
    create: (data) => api.post('/admin/structural/organizational-units', data),
    update: (id, data) => api.put(`/admin/structural/organizational-units/${id}`, data),
    delete: (id) => api.delete(`/admin/structural/organizational-units/${id}`)
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

/** Auditoria de interações IA (admin empresa) — tenta /admin/logs/ai-traces, depois /admin/ai-audit (404 em deploys antigos). */
export const adminAiAudit = {
  async list(params) {
    try {
      return await api.get('/admin/logs/ai-traces', { params });
    } catch (e) {
      if (e.response?.status === 404) {
        return await api.get('/admin/ai-audit', { params });
      }
      throw e;
    }
  }
};

/** Incidentes de qualidade da IA — gestão tenant (admin empresa) */
export const adminIncidents = {
  list: (params) => api.get('/admin/incidents', { params }),
  stats: (params) => api.get('/admin/incidents/stats', { params }),
  get: (id) => api.get(`/admin/incidents/${encodeURIComponent(id)}`),
  update: (id, body) => api.patch(`/admin/incidents/${encodeURIComponent(id)}`, body)
};

/** Governança cognitiva — painel só leitura (backend: /api/admin/learning/dashboard) */
export const adminCognitiveGovernance = {
  getDashboard: () => api.get('/admin/learning/dashboard'),
  /** Inventário normativo completo — admin sistema; requer IMPETUS_POLICY_DISCOVERY_ENABLED=true */
  getPolicyDiscovery: () => api.get('/admin/learning/policy-discovery'),
  /** Catálogo PDC — admin sistema; requer IMPETUS_POLICY_CONTRACT_ENABLED=true */
  getPolicyContract: () => api.get('/admin/learning/policy-contract'),
  /** PSA — sinais universais; requer IMPETUS_POLICY_SIGNALS_ENABLED=true */
  getPolicySignals: () => api.get('/admin/learning/policy-signals'),
  /** Policy Facade — agregação passiva; requer IMPETUS_POLICY_FACADE_ENABLED=true */
  getPolicyFacade: () => api.get('/admin/learning/policy-facade'),
  /** Policy Arbitration — read-only; requer IMPETUS_POLICY_ARBITRATION_ENABLED=true */
  getPolicyArbitration: () => api.get('/admin/learning/policy-arbitration'),
  /** Policy Obligations — declarativas; requer IMPETUS_POLICY_OBLIGATIONS_ENABLED=true */
  getPolicyObligations: () => api.get('/admin/learning/policy-obligations'),
  /** Policy Governance Graph — topologia normativa read-only; requer IMPETUS_POLICY_GRAPH_ENABLED=true */
  getPolicyGraph: () => api.get('/admin/learning/policy-graph'),
  /** Policy Execution Readiness — prontidão normativa read-only; requer IMPETUS_POLICY_READINESS_ENABLED=true */
  getPolicyReadiness: () => api.get('/admin/learning/policy-readiness'),
  /** Policy Simulation Runtime — dry-run normativo read-only; requer IMPETUS_POLICY_SIMULATION_ENABLED=true */
  getPolicySimulation: () => api.get('/admin/learning/policy-simulation'),
  /** Policy Sandbox shadow — twin governance read-only; requer IMPETUS_POLICY_SANDBOX_ENABLED=true */
  getPolicySandbox: () => api.get('/admin/learning/policy-sandbox'),
  /** Policy Governance Diff — produção vs sandbox read-only; requer IMPETUS_POLICY_DIFF_ENABLED=true */
  getPolicyGovernanceDiff: () => api.get('/admin/learning/policy-diff'),
  /** Policy Governance Evolution — trajetória normativa read-only; requer IMPETUS_POLICY_EVOLUTION_ENABLED=true */
  getPolicyGovernanceEvolution: () => api.get('/admin/learning/policy-evolution')
};

/** Action Runtime + HITL — aprovações supervisionadas (backend: /api/action-runtime) */
/** PROMPT 32 — Final consolidation audit */
export const finalConsolidationAuditApi = {
  getHealth: () => api.get('/final-consolidation-audit/health'),
  listPrompts: () => api.get('/final-consolidation-audit/prompts'),
  runAudit: (body) => api.post('/final-consolidation-audit/audit', body || {}),
  quickAudit: (params) => api.get('/final-consolidation-audit/audit/quick', { params }),
  getSnapshots: (params) => api.get('/final-consolidation-audit/snapshots', { params })
};

/** PROMPT 31 — Certification readiness */
export const certificationReadinessApi = {
  getHealth: () => api.get('/certification-readiness/health'),
  getFrameworks: () => api.get('/certification-readiness/frameworks'),
  runAssessment: (body) => api.post('/certification-readiness/assess', body || {}),
  quickAssess: (params) => api.get('/certification-readiness/assess/quick', { params }),
  getSnapshots: (params) => api.get('/certification-readiness/snapshots', { params })
};

/** PROMPT 30 — Enterprise locale / i18n / timezone */
export const enterpriseLocaleApi = {
  getHealth: () => api.get('/enterprise-locale/health'),
  getContext: () => api.get('/enterprise-locale/context'),
  getCatalogs: () => api.get('/enterprise-locale/catalogs'),
  formatDateTime: (body) => api.post('/enterprise-locale/format/datetime', body),
  formatCurrency: (body) => api.post('/enterprise-locale/format/currency', body),
  convertCurrency: (body) => api.post('/enterprise-locale/currency/convert', body)
};

/** PROMPT 29 — Rollout Center unificado */
export const rolloutCenterApi = {
  getHealth: () => api.get('/rollout-center/health'),
  getDashboard: () => api.get('/rollout-center/dashboard'),
  getCapabilities: () => api.get('/rollout-center/capabilities'),
  getEffectiveFlags: () => api.get('/rollout-center/flags/effective'),
  getGates: (params) => api.get('/rollout-center/gates', { params }),
  evaluateGate: (capabilityId, targetMode) =>
    api.post('/rollout-center/gates/evaluate', { capability_id: capabilityId, target_mode: targetMode }),
  getAudit: (params) => api.get('/rollout-center/audit', { params })
};

export const actionRuntimeApi = {
  getHealth: () => api.get('/action-runtime/health'),
  getPendingApprovals: (params) => api.get('/action-runtime/approvals/pending', { params }),
  approve: (id) => api.post(`/action-runtime/approvals/${id}/approve`),
  reject: (id, body) => api.post(`/action-runtime/approvals/${id}/reject`, body),
  getTraces: (params) => api.get('/action-runtime/traces', { params }),
  rollback: (traceId) => api.post(`/action-runtime/rollback/${encodeURIComponent(traceId)}`)
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

/**
 * AIOI — Algoritmo Industrial Operacional Inteligente
 * Queue API: fonte única de verdade para fila executiva CEO.
 * ORG-1: aioi_executive_queue_snapshot é AUTHORITATIVE.
 * READ ONLY — nenhuma escrita via frontend.
 */
export const aioi = {
  /** GET /api/aioi/health — status da camada AIOI */
  health: () => api.get('/aioi/health'),
  /** GET /api/aioi/queue — fila executiva CEO (snapshot AIOI) */
  getQueue: (params) => api.get('/aioi/queue', { params }),
  /** GET /api/aioi/queue/bundle — queue + read model + view model */
  getQueueBundle: (params) => api.get('/aioi/queue/bundle', { params }),
  /** GET /api/aioi/runtime/health — P1A.6 health do runtime contínuo */
  getRuntimeHealth: () => api.get('/aioi/runtime/health'),
  /** GET /api/aioi/runtime/metrics — P1A.5 métricas operacionais */
  getRuntimeMetrics: () => api.get('/aioi/runtime/metrics'),
  /** GET /api/aioi/runtime/status — estado do continuous worker */
  getRuntimeStatus: () => api.get('/aioi/runtime/status'),
  /** GET /api/aioi/governance/status — P1D.6 governance consolidado */
  getGovernanceStatus: () => api.get('/aioi/governance/status'),
  /** GET /api/aioi/governance/capacity — capacity guardrails */
  getGovernanceCapacity: () => api.get('/aioi/governance/capacity'),
  /** GET /api/aioi/governance/retention — dry-run retenção */
  getGovernanceRetention: () => api.get('/aioi/governance/retention'),
  /** GET /api/aioi/scale/status — P1E.7 horizontal scale consolidado */
  getScaleStatus: () => api.get('/aioi/scale/status'),
  /** GET /api/aioi/scale/partitions — tenant partition map */
  getScalePartitions: () => api.get('/aioi/scale/partitions'),
  /** GET /api/aioi/scale/workers — cluster & benchmark */
  getScaleWorkers: () => api.get('/aioi/scale/workers'),
  /** GET /api/aioi/scale/validation — P1F shadow validation summary */
  getScaleValidation: () => api.get('/aioi/scale/validation'),
  /** GET /api/aioi/scale/leases — lease health metrics */
  getScaleLeases: () => api.get('/aioi/scale/leases'),
  /** GET /api/aioi/scale/ownership — partition ownership metrics */
  getScaleOwnership: () => api.get('/aioi/scale/ownership'),
  /** GET /api/aioi/scale/runtime — P1G activation runtime status */
  getScaleRuntime: () => api.get('/aioi/scale/runtime'),
  /** GET /api/aioi/scale/registry — P1G registry activation status */
  getScaleRegistry: () => api.get('/aioi/scale/registry'),
  /** GET /api/aioi/scale/benchmark — P1G benchmark metrics */
  getScaleBenchmark: () => api.get('/aioi/scale/benchmark'),
  /** GET /api/aioi/scale/distributed — P1H distributed runtime status */
  getScaleDistributed: () => api.get('/aioi/scale/distributed'),
  /** GET /api/aioi/scale/telemetry — P1I distributed telemetry */
  getScaleTelemetry: () => api.get('/aioi/scale/telemetry'),
  /** GET /api/aioi/scale/health — P1I cluster health */
  getScaleHealth: () => api.get('/aioi/scale/health'),
  /** GET /api/aioi/scale/capacity — P1I capacity planning */
  getScaleCapacity: () => api.get('/aioi/scale/capacity'),
  /** GET /api/aioi/scale/audit — P1I distributed audit trail */
  getScaleAudit: () => api.get('/aioi/scale/audit'),

  getProductionReadiness: () => api.get('/aioi/production/readiness'),
  getProductionRisk: () => api.get('/aioi/production/risk'),
  getProductionCertifications: () => api.get('/aioi/production/certifications'),
  getProductionAudit: () => api.get('/aioi/production/audit'),

  getDeploymentGovernance: () => api.get('/aioi/production/deployment'),
  getDeploymentApproval: (approvalId) => api.get('/aioi/production/approval', { params: approvalId ? { approval_id: approvalId } : {} }),
  getProductionRollouts: (params) => api.get('/aioi/production/rollouts', { params }),
  getReadinessHistory: (params) => api.get('/aioi/production/readiness-history', { params }),

  getOperationalDataset: () => api.get('/aioi/operations/dataset'),
  getOperationalWorkload: () => api.get('/aioi/operations/workload'),
  getOperationalConsistency: () => api.get('/aioi/operations/consistency'),
  getOperationalCertification: () => api.get('/aioi/operations/certification'),

  getAuthorizationPolicies: () => api.get('/aioi/authorization/policies'),
  getAuthorizationRequests: (params) => api.get('/aioi/authorization/requests', { params }),
  getAuthorizationHistory: (params) => api.get('/aioi/authorization/history', { params }),
  getAuthorizationStatus: () => api.get('/aioi/authorization/status'),

  getComplianceIntegrity: () => api.get('/aioi/compliance/integrity'),
  getComplianceDrift: () => api.get('/aioi/compliance/drift'),
  getComplianceGovernance: () => api.get('/aioi/compliance/governance'),
  getComplianceStatus: () => api.get('/aioi/compliance/status'),

  getBaselineStatus: () => api.get('/aioi/baseline/status'),
  getBaselineManifest: () => api.get('/aioi/baseline/manifest'),
  getBaselineReproducibility: () => api.get('/aioi/baseline/reproducibility'),
  getBaselineAudit: () => api.get('/aioi/baseline/audit'),

  getAssuranceStatus: () => api.get('/aioi/assurance/status'),
  getAssurancePreservation: () => api.get('/aioi/assurance/preservation'),
  getAssuranceConsistency: () => api.get('/aioi/assurance/consistency'),
  getAssuranceTraceability: () => api.get('/aioi/assurance/traceability'),

  getRecoveryStatus: () => api.get('/aioi/recovery/status'),
  getRecoveryChain: () => api.get('/aioi/recovery/chain'),
  getRecoveryRebuild: () => api.get('/aioi/recovery/rebuild'),
  getRecoveryContinuity: () => api.get('/aioi/recovery/continuity'),

  getReleaseStatus: () => api.get('/aioi/release/status'),
  getReleaseRegistry: () => api.get('/aioi/release/registry'),
  getReleaseGovernance: () => api.get('/aioi/release/governance'),
  getReleaseReadiness: () => api.get('/aioi/release/readiness'),
  getClosureStatus: () => api.get('/aioi/archive/status'),
  getArchiveRegistry: () => api.get('/aioi/archive/registry'),
  getEnterpriseMilestone: () => api.get('/aioi/archive/milestone'),
  getClosureReport: () => api.get('/aioi/archive/report')
};

/** F49-D — Gemini readiness (READ ONLY) */
export const f49 = {
  getGeminiStatus: () => api.get('/f49/gemini/status'),
  getGeminiReadiness: (params) => api.get('/f49/gemini/readiness', { params }),
  getGeminiVision: () => api.get('/f49/gemini/vision'),
  getGeminiBenchmark: () => api.get('/f49/gemini/benchmark'),
  /** F49-F — Truth program closure (READ ONLY) */
  getClosureStatus: () => api.get('/f49/closure/status'),
  getClosureRegistry: () => api.get('/f49/closure/registry'),
  getClosureReport: () => api.get('/f49/closure/report'),
  getClosureFinalStatus: () => api.get('/f49/closure/final-status')
};

/** P0A — Continuous operation (READ ONLY) */
export const operations = {
  getContinuousStatus: () => api.get('/operations/continuous/status'),
  getContinuousReadiness: () => api.get('/operations/continuous/readiness'),
  getContinuousObservation: (params) => api.get('/operations/continuous/observation', { params }),
  getContinuousHealth: () => api.get('/operations/continuous/health'),
  /** P0B — Continuous operation observation (READ ONLY) */
  getObservationStatus: (params) => api.get('/operations/observation/status', { params }),
  getObservationIngestion: (params) => api.get('/operations/observation/ingestion', { params }),
  getObservationWorkflows: (params) => api.get('/operations/observation/workflows', { params }),
  getObservationAI: (params) => api.get('/operations/observation/ai', { params }),
  getObservationPlatform: () => api.get('/operations/observation/platform'),
  getObservationRegistry: (params) => api.get('/operations/observation/registry', { params }),
  /** P0C — Active continuous operation validation (READ ONLY) */
  getActiveStatus: (params) => api.get('/operations/active/status', { params }),
  getActiveIoe: (params) => api.get('/operations/active/ioe', { params }),
  getActiveRuntime: (params) => api.get('/operations/active/runtime', { params }),
  getActiveOutbox: (params) => api.get('/operations/active/outbox', { params }),
  getActiveStability: (params) => api.get('/operations/active/stability', { params }),
  /** P0D — Runtime activation & stabilization (READ ONLY) */
  getRuntimeStatus: (params) => api.get('/operations/runtime/status', { params }),
  getRuntimeActivation: (params) => api.get('/operations/runtime/activation', { params }),
  getRuntimeStabilization: (params) => api.get('/operations/runtime/stabilization', { params }),
  getRuntimeHealth: () => api.get('/operations/runtime/health'),
  getRuntimeRegistry: (params) => api.get('/operations/runtime/registry', { params }),
  /** P0E — Go-live monitoring & production acceptance (READ ONLY) */
  getGoLiveStatus: () => api.get('/operations/golive/status'),
  getGoLive24h: () => api.get('/operations/golive/24h'),
  getGoLive72h: () => api.get('/operations/golive/72h'),
  getGoLiveAcceptance: () => api.get('/operations/golive/acceptance'),
  getGoLiveRegistry: (params) => api.get('/operations/golive/registry', { params })
};

/** M1.6 — Production Domain Operational Validation (READ ONLY) */
export const m1Validation = {
  getStatus:      () => api.get('/m1/validation/status'),
  getSafety:      () => api.get('/m1/validation/safety'),
  getEnvironment: () => api.get('/m1/validation/environment'),
  getExecutive:   () => api.get('/m1/validation/executive'),
  getMaintenance: () => api.get('/m1/validation/maintenance'),
  getHR:          () => api.get('/m1/validation/hr'),
  getFinancial:   () => api.get('/m1/validation/financial'),
};

/** M1.7 — Pilot Readiness Simulation (READ ONLY) */
export const m1PilotReadiness = {
  getStatus:      () => api.get('/m1/pilot-readiness/status'),
  getSafety:      () => api.get('/m1/pilot-readiness/safety'),
  getEnvironment: () => api.get('/m1/pilot-readiness/environment'),
  getMaintenance: () => api.get('/m1/pilot-readiness/maintenance'),
  getHR:          () => api.get('/m1/pilot-readiness/hr'),
  getFinancial:   () => api.get('/m1/pilot-readiness/financial'),
  getExecutive:   () => api.get('/m1/pilot-readiness/executive'),
};

/** M1.14 — M2 Readiness Governance Assessment (READ ONLY) */
export const m1Governance = {
  getStatus:         () => api.get('/m1/governance/status'),
  getEvidence:       () => api.get('/m1/governance/evidence'),
  getRisks:          () => api.get('/m1/governance/risks'),
  getDependencies:   () => api.get('/m1/governance/dependencies'),
  getRecommendation: () => api.get('/m1/governance/recommendation'),
};

/** M1.15 — Platform Closure Audit (READ ONLY) */
export const m1PlatformClosure = {
  getStatus:       () => api.get('/m1/platform-closure/status'),
  getFinancial:    () => api.get('/m1/platform-closure/financial'),
  getAioiWorker:   () => api.get('/m1/platform-closure/aioi-worker'),
  getTelemetry:    () => api.get('/m1/platform-closure/telemetry'),
  getShadowRuntime: () => api.get('/m1/platform-closure/shadow-runtime'),
};

/** M1.16 — Critical Remediation (READ ONLY assessment) */
export const m1CriticalRemediation = {
  getStatus:     () => api.get('/m1/critical-remediation/status'),
  getFinancial:  () => api.get('/m1/critical-remediation/financial'),
  getProduction: () => api.get('/m1/critical-remediation/production'),
  getQuality:    () => api.get('/m1/critical-remediation/quality'),
  getRegression: () => api.get('/m1/critical-remediation/regression'),
};

/** M1.17 — Pilot Adoption Closure Assessment (READ ONLY) */
export const m1PilotAdoptionClosure = {
  getStatus:       () => api.get('/m1/pilot-adoption-closure/status'),
  getEnvironment:  () => api.get('/m1/pilot-adoption-closure/environment'),
  getMaintenance:  () => api.get('/m1/pilot-adoption-closure/maintenance'),
  getUtilization:  () => api.get('/m1/pilot-adoption-closure/utilization'),
  getGate:         () => api.get('/m1/pilot-adoption-closure/gate'),
};

/** M1.13 — Pilot Adoption Assessment (READ ONLY) */
export const m1PilotAdoption = {
  getStatus:         () => api.get('/m1/pilot-adoption/status'),
  getEnvironment:    () => api.get('/m1/pilot-adoption/environment'),
  getMaintenance:    () => api.get('/m1/pilot-adoption/maintenance'),
  getUtilization:    () => api.get('/m1/pilot-adoption/utilization'),
  getRecommendation: () => api.get('/m1/pilot-adoption/recommendation'),
};

/** M1.12 — Pilot Operational Closure (Environment + Maintenance blockers) */
export const m1PilotClosure = {
  getStatus:      () => api.get('/m1/pilot-closure/status'),
  getEnvironment: () => api.get('/m1/pilot-closure/environment'),
  getMaintenance: () => api.get('/m1/pilot-closure/maintenance'),
  getGate:        () => api.get('/m1/pilot-closure/gate'),
};

/** M1.11 — Pilot Operation Window (READ ONLY · real usage) */
export const m1PilotOperation = {
  getStatus:      () => api.get('/m1/pilot-operation/status'),
  getExecutive:   () => api.get('/m1/pilot-operation/executive'),
  getFinancial:   () => api.get('/m1/pilot-operation/financial'),
  getHr:          () => api.get('/m1/pilot-operation/hr'),
  getSafety:      () => api.get('/m1/pilot-operation/safety'),
  getEnvironment: () => api.get('/m1/pilot-operation/environment'),
  getMaintenance: () => api.get('/m1/pilot-operation/maintenance'),
  getActivity:    () => api.get('/m1/pilot-operation/activity'),
  getRuntime:     () => api.get('/m1/pilot-operation/runtime'),
};

/** M1.10 — Food Base Pilot Provisioning (Controlled Go-Live) */
export const m1FoodBasePilot = {
  getStatus:      () => api.get('/m1/foodbase-pilot/status'),
  getStrategy:    () => api.get('/m1/foodbase-pilot/strategy'),
  getProvisioning: () => api.get('/m1/foodbase-pilot/provisioning'),
  getPilotLists:  () => api.get('/m1/foodbase-pilot/pilot-lists'),
  getProfiles:    () => api.get('/m1/foodbase-pilot/profiles'),
  getExecutive:   () => api.get('/m1/foodbase-pilot/executive'),
  getDomains:     () => api.get('/m1/foodbase-pilot/domains'),
  getAioi:        () => api.get('/m1/foodbase-pilot/aioi'),
  getFoodbaseApi: () => api.get('/m1/foodbase-pilot/foodbase-api'),
};

/** M1.9 — Pilot Execution Dry Run (READ ONLY · tenant proxy) */
export const m1PilotExecution = {
  getStatus:      () => api.get('/m1/pilot-execution/status'),
  getCeo:         () => api.get('/m1/pilot-execution/ceo'),
  getCfo:         () => api.get('/m1/pilot-execution/cfo'),
  getHr:          () => api.get('/m1/pilot-execution/hr'),
  getSafety:      () => api.get('/m1/pilot-execution/safety'),
  getEnvironment: () => api.get('/m1/pilot-execution/environment'),
  getMaintenance: () => api.get('/m1/pilot-execution/maintenance'),
  getNavigation:  () => api.get('/m1/pilot-execution/navigation'),
};

/** M1.8 — Food Base Go-Live Readiness (READ ONLY · SIMULATION ONLY) */
export const m1FoodBase = {
  getStatus:      () => api.get('/m1/foodbase/status'),
  getTenant:      () => api.get('/m1/foodbase/tenant'),
  getSecurity:    () => api.get('/m1/foodbase/security'),
  getRoles:       () => api.get('/m1/foodbase/roles'),
  getPermissions: () => api.get('/m1/foodbase/permissions'),
  getExecutive:   () => api.get('/m1/foodbase/executive'),
  getSafety:      () => api.get('/m1/foodbase/safety'),
  getEnvironment: () => api.get('/m1/foodbase/environment'),
  getHR:          () => api.get('/m1/foodbase/hr'),
  getFinancial:   () => api.get('/m1/foodbase/financial'),
  getMaintenance: () => api.get('/m1/foodbase/maintenance'),
};