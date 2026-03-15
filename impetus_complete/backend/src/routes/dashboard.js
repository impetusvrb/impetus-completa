/**
 * ROTAS DE DASHBOARD E MÉTRICAS
 * KPIs, Estatísticas, Gráficos
 * Fase 4: Cache em memória para reduzir carga no banco
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireCompanyActive } = require('../middleware/multiTenant');
const { promptFirewall } = require('../middleware/promptFirewall');
const { userRateLimit } = require('../middleware/userRateLimit');
const { authorize } = require('../middleware/authorize');
const secureContextBuilder = require('../services/secureContextBuilder');
const aiAudit = require('../services/aiAudit');
const smartSummary = require('../services/smartSummary');
const ai = require('../services/ai');
const documentContext = require('../services/documentContext');
const dashboardVisibility = require('../services/dashboardVisibility');
const executiveMode = require('../services/executiveMode');
const userContext = require('../services/userContext');
const dashboardFilter = require('../services/dashboardFilter');
const { requireHierarchyScope } = require('../middleware/hierarchyScope');
const chatUserContext = require('../services/chatUserContext');
const claudeAnalytics = require('../services/claudeAnalyticsService');
const intelligentDashboard = require('../services/intelligentDashboardService');
const { cached, del, makeKey, TTL } = require('../utils/cache');

function invalidateDashboardCache(userId) {
  del(makeKey('dashboard:me', String(userId)));
}
const dashboardProfileResolver = require('../services/dashboardProfileResolver');
const dynamicDashboard = require('../services/dynamicDashboardService');
const maintenanceDashboard = require('../services/maintenanceDashboardService');
const multimodalChat = require('../services/multimodalChatService');
const audioMonitoring = require('../services/audioMonitoringService');
const operationalBrain = require('../services/operationalBrainEngine');
const operationalKnowledgeMap = require('../services/operationalKnowledgeMapService');
const operationalInsights = require('../services/operationalInsightsService');
const operationalAlerts = require('../services/operationalAlertsService');
const machineBrain = require('../services/machineBrainService');
const machineControl = require('../services/machineControlService');
const machineSafety = require('../services/machineSafetyService');
const industrialOperationalMap = require('../services/industrialOperationalMapService');
const operationalForecasting = require('../services/operationalForecastingService');
const operationalForecastingAI = require('../services/operationalForecastingAI');
const operationalForecastingAdvanced = require('../services/operationalForecastingAdvancedService');
const industrialCost = require('../services/industrialCostService');
const financialLeakage = require('../services/financialLeakageDetectorService');
const { requireIndustrialView, requireIndustrialAdmin, canConfigureIndustrial } = require('../middleware/industrialIntegrationAccess');

function requireIndustrialCostAdmin(req, res, next) {
  const role = (req.user?.role || '').toLowerCase();
  if (role === 'admin' || role === 'internal_admin') return next();
  return res.status(403).json({ ok: false, error: 'Cadastro de custos restrito ao Admin do software.', code: 'COST_ADMIN_REQUIRED' });
}

function requireIndustrialCostView(req, res, next) {
  const role = (req.user?.role || '').toLowerCase();
  const hierarchy = req.user?.hierarchy_level ?? 5;
  if (['admin', 'internal_admin', 'ceo', 'diretor'].includes(role) || hierarchy <= 1) return next();
  return res.status(403).json({ ok: false, error: 'Relatórios financeiros restritos a CEO e Diretores.', code: 'COST_VIEW_DENIED' });
}

// Perfis de manutenção (mecânico, eletricista, eletromecânico, supervisor, coordenador, gerente)
const MAINTENANCE_PROFILES = new Set(['technician_maintenance', 'supervisor_maintenance', 'coordinator_maintenance', 'manager_maintenance']);

function isMaintenanceProfile(user) {
  const config = dashboardProfileResolver.getDashboardConfigForUser(user);
  return MAINTENANCE_PROFILES.has(config.profile_code) ||
    (user.functional_area || '').toLowerCase() === 'maintenance' ||
    /mecanico|eletricista|eletromecânico|manutenção/i.test(user.job_title || '');
}

// ============================================================================
// DASHBOARD INTELIGENTE - Perfil personalizado por role + área + preferências
// ============================================================================

/**
 * GET /api/dashboard/me
 * Payload completo do dashboard personalizado (perfil + KPIs + insights + preferências)
 * Cache 90s por usuário para reduzir carga em sessões intensas
 */
router.get('/me', requireAuth, requireHierarchyScope, async (req, res) => {
  try {
    const user = req.user;
    const payload = await cached(
      'dashboard:me',
      () => intelligentDashboard.buildDashboardPayload(user),
      () => String(user.id),
      TTL.DASHBOARD_ME
    );
    res.json(payload);
  } catch (err) {
    console.error('[DASHBOARD_ME_ERROR]', err);
    res.status(500).json({ ok: false, error: 'Erro ao montar dashboard' });
  }
});

/**
 * GET /api/dashboard/config
 * Configuração do perfil (cards, widgets, módulos) sem dados dinâmicos
 */
router.get('/config', requireAuth, (req, res) => {
  try {
    const config = dashboardProfileResolver.getDashboardConfigForUser(req.user);
    res.json({
      ok: true,
      profile_code: config.profile_code,
      profile_config: config.profile_config,
      functional_area: config.functional_area
    });
  } catch (err) {
    console.error('[DASHBOARD_CONFIG_ERROR]', err);
    res.status(500).json({ ok: false, error: 'Erro ao buscar configuração' });
  }
});

/**
 * POST /api/dashboard/preferences
 * Salva preferências do usuário (ordem de cards, período, layout)
 */
router.post('/preferences', requireAuth, async (req, res) => {
  try {
    const { cards_order, favorite_kpis, default_period, default_sector, compact_mode, pinned_widgets, sections_priority } = req.body;
    const ok = await intelligentDashboard.savePreferences(req.user.id, {
      cards_order,
      favorite_kpis,
      default_period,
      default_sector,
      compact_mode,
      pinned_widgets,
      sections_priority
    });
    if (!ok) return res.status(500).json({ ok: false, error: 'Erro ao salvar preferências' });
    invalidateDashboardCache(req.user.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[DASHBOARD_PREFERENCES_ERROR]', err);
    res.status(500).json({ ok: false, error: 'Erro ao salvar preferências' });
  }
});

/**
 * POST /api/dashboard/favorite-kpis
 * Atualiza KPIs favoritos do usuário
 */
router.post('/favorite-kpis', requireAuth, async (req, res) => {
  try {
    const { favorite_kpis } = req.body;
    const list = Array.isArray(favorite_kpis) ? favorite_kpis : [];
    const ok = await intelligentDashboard.savePreferences(req.user.id, { favorite_kpis: list });
    if (!ok) return res.status(500).json({ ok: false, error: 'Erro ao salvar KPIs favoritos' });
    invalidateDashboardCache(req.user.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[DASHBOARD_FAVORITE_KPIS_ERROR]', err);
    res.status(500).json({ ok: false, error: 'Erro ao salvar KPIs favoritos' });
  }
});

/**
 * POST /api/dashboard/track-interaction
 * Registra interação para personalização por comportamento
 */
router.post('/track-interaction', requireAuth, async (req, res) => {
  try {
    const { event_type, entity_type, entity_id, context } = req.body;
    if (!event_type || typeof event_type !== 'string') {
      return res.status(400).json({ ok: false, error: 'event_type obrigatório' });
    }
    await intelligentDashboard.trackInteraction(
      req.user.id,
      req.user.company_id,
      event_type,
      entity_type,
      entity_id,
      context || {}
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[DASHBOARD_TRACK_ERROR]', err);
    res.status(500).json({ ok: false, error: 'Erro ao registrar interação' });
  }
});

/**
 * GET /api/dashboard/widgets
 * Lista widgets disponíveis para o perfil do usuário
 */
router.get('/widgets', requireAuth, (req, res) => {
  try {
    const config = dashboardProfileResolver.getDashboardConfigForUser(req.user);
    const widgets = config.profile_config?.widgets || [];
    res.json({ ok: true, widgets });
  } catch (err) {
    console.error('[DASHBOARD_WIDGETS_ERROR]', err);
    res.status(500).json({ ok: false, error: 'Erro ao buscar widgets' });
  }
});

/**
 * GET /api/dashboard/dynamic-layout
 * Layout dinâmico de widgets baseado em perfil (cargo, departamento, hierarquia)
 * Retorna { widgets, layout, alerts, userProfile }
 */
router.get('/dynamic-layout', requireAuth, (req, res) => {
  try {
    const layout = dynamicDashboard.getDynamicLayout(req.user);
    res.json({ ok: true, ...layout });
  } catch (err) {
    console.error('[DASHBOARD_DYNAMIC_LAYOUT_ERROR]', err);
    res.status(500).json({ ok: false, error: 'Erro ao gerar layout dinâmico' });
  }
});

// ============================================================================
// ONBOARDING DO DASHBOARD - Primeiro acesso para personalização
// ============================================================================
const dashboardOnboarding = require('../services/dashboardOnboardingService');

/**
 * GET /api/dashboard/onboarding-status
 * Verifica se usuário precisa do onboarding de dashboard
 */
router.get('/onboarding-status', requireAuth, async (req, res) => {
  try {
    const needs = await dashboardOnboarding.needsDashboardOnboarding(req.user);
    const questions = dashboardOnboarding.getQuestions();
    res.json({ ok: true, needs, questions });
  } catch (err) {
    console.error('[DASHBOARD_ONBOARDING_STATUS]', err);
    res.status(500).json({ ok: false, error: 'Erro ao verificar status' });
  }
});

/**
 * POST /api/dashboard/onboarding
 * Salva respostas do onboarding e atualiza preferências
 */
router.post('/onboarding', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const { answers } = req.body;
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ ok: false, error: 'answers obrigatório' });
    }
    await dashboardOnboarding.saveDashboardOnboarding(
      req.user.id,
      req.user.company_id,
      answers
    );
    invalidateDashboardCache(req.user.id);
    res.json({ ok: true, message: 'Preferências salvas com sucesso' });
  } catch (err) {
    console.error('[DASHBOARD_ONBOARDING]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao salvar' });
  }
});

// ============================================================================
// DASHBOARD OPERACIONAL MANUTENÇÃO - Perfil mecânico/eletricista
// ============================================================================

/**
 * GET /api/dashboard/maintenance/summary
 * Resumo técnico do dia (cabeçalho)
 */
router.get('/maintenance/summary', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    if (!isMaintenanceProfile(req.user)) {
      return res.json({ ok: true, is_maintenance: false, summary: null });
    }
    const summary = await maintenanceDashboard.getTechnicalSummary(req.user.company_id, req.user.id);
    res.json({ ok: true, is_maintenance: true, summary });
  } catch (err) {
    console.error('[MAINTENANCE_SUMMARY]', err);
    res.status(500).json({ ok: false, error: 'Erro ao buscar resumo técnico' });
  }
});

/**
 * GET /api/dashboard/maintenance/cards
 * Cards técnicos (contagens)
 */
router.get('/maintenance/cards', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    if (!isMaintenanceProfile(req.user)) {
      return res.json({ ok: true, is_maintenance: false, cards: null });
    }
    const cards = await maintenanceDashboard.getTechnicalCards(req.user.company_id, req.user.id);
    res.json({ ok: true, is_maintenance: true, cards });
  } catch (err) {
    console.error('[MAINTENANCE_CARDS]', err);
    res.status(500).json({ ok: false, error: 'Erro ao buscar cards' });
  }
});

/**
 * GET /api/dashboard/maintenance/my-tasks
 * Minhas tarefas de hoje (OS atribuídas)
 */
router.get('/maintenance/my-tasks', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    if (!isMaintenanceProfile(req.user)) {
      return res.json({ ok: true, is_maintenance: false, tasks: [] });
    }
    const tasks = await maintenanceDashboard.getMyTasksToday(req.user.company_id, req.user.id);
    res.json({ ok: true, is_maintenance: true, tasks });
  } catch (err) {
    console.error('[MAINTENANCE_MY_TASKS]', err);
    res.status(500).json({ ok: false, error: 'Erro ao buscar tarefas' });
  }
});

/**
 * GET /api/dashboard/maintenance/machines-attention
 * Máquinas em atenção
 */
router.get('/maintenance/machines-attention', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    if (!isMaintenanceProfile(req.user)) {
      return res.json({ ok: true, is_maintenance: false, machines: [] });
    }
    const machines = await maintenanceDashboard.getMachinesInAttention(req.user.company_id);
    res.json({ ok: true, is_maintenance: true, machines });
  } catch (err) {
    console.error('[MAINTENANCE_MACHINES]', err);
    res.status(500).json({ ok: false, error: 'Erro ao buscar máquinas' });
  }
});

/**
 * GET /api/dashboard/maintenance/interventions
 * Últimas intervenções
 */
router.get('/maintenance/interventions', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    if (!isMaintenanceProfile(req.user)) {
      return res.json({ ok: true, is_maintenance: false, interventions: [] });
    }
    const interventions = await maintenanceDashboard.getLastInterventions(req.user.company_id);
    res.json({ ok: true, is_maintenance: true, interventions });
  } catch (err) {
    console.error('[MAINTENANCE_INTERVENTIONS]', err);
    res.status(500).json({ ok: false, error: 'Erro ao buscar intervenções' });
  }
});

/**
 * GET /api/dashboard/maintenance/preventives
 * Preventivas do dia
 */
router.get('/maintenance/preventives', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    if (!isMaintenanceProfile(req.user)) {
      return res.json({ ok: true, is_maintenance: false, preventives: [] });
    }
    const preventives = await maintenanceDashboard.getPreventivesToday(req.user.company_id, req.user.id);
    res.json({ ok: true, is_maintenance: true, preventives });
  } catch (err) {
    console.error('[MAINTENANCE_PREVENTIVES]', err);
    res.status(500).json({ ok: false, error: 'Erro ao buscar preventivas' });
  }
});

/**
 * GET /api/dashboard/maintenance/recurring-failures
 * Falhas recorrentes
 */
router.get('/maintenance/recurring-failures', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    if (!isMaintenanceProfile(req.user)) {
      return res.json({ ok: true, is_maintenance: false, failures: [] });
    }
    const failures = await maintenanceDashboard.getRecurringFailures(req.user.company_id);
    res.json({ ok: true, is_maintenance: true, failures });
  } catch (err) {
    console.error('[MAINTENANCE_RECURRING]', err);
    res.status(500).json({ ok: false, error: 'Erro ao buscar falhas recorrentes' });
  }
});

/**
 * POST /api/dashboard/maintenance/shift-log
 * Registro técnico do turno (ou passagem de turno)
 * body: { content, log_type?: 'turn_record'|'shift_handover', structured_data?: {} }
 */
router.post('/maintenance/shift-log', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    if (!isMaintenanceProfile(req.user)) {
      return res.status(403).json({ ok: false, error: 'Perfil de manutenção necessário' });
    }
    const { content, log_type = 'turn_record', structured_data } = req.body;
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ ok: false, error: 'Conteúdo obrigatório' });
    }
    const log = await maintenanceDashboard.saveShiftTechnicalLog(
      req.user.company_id, req.user.id, content.trim(), structured_data || {}, log_type
    );
    res.json({ ok: true, log });
  } catch (err) {
    console.error('[MAINTENANCE_SHIFT_LOG]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao salvar registro' });
  }
});

/**
 * POST /api/dashboard/maintenance/shift-log-with-ai
 * Registro técnico do turno com IA para estruturar o texto
 * body: { content }
 */
router.post('/maintenance/shift-log-with-ai', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    if (!isMaintenanceProfile(req.user)) {
      return res.status(403).json({ ok: false, error: 'Perfil de manutenção necessário' });
    }
    const { content } = req.body;
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ ok: false, error: 'Conteúdo obrigatório' });
    }
    let structuredData = {};
    try {
      const ai = require('../services/ai');
      const prompt = `Organize o seguinte registro técnico de turno em campos estruturados (JSON). Extraia: o_que_fez (lista), o_que_encontrou (lista), o_que_trocou (lista), pendente (lista), acompanhar (lista), maquina_risco (texto), peca_falta (texto), observacoes (texto). Mantenha a informação original. Retorne APENAS um objeto JSON válido, sem markdown.`;
      const reply = await ai.chatCompletion(`${prompt}\n\nRegistro:\n${content.slice(0, 2000)}`, { max_tokens: 600 });
      if (reply && !reply.startsWith('FALLBACK:')) {
        const jsonMatch = (reply || '').match(/\{[\s\S]*\}/);
        if (jsonMatch) structuredData = JSON.parse(jsonMatch[0]);
      }
    } catch (aiErr) {
      console.warn('[MAINTENANCE_AI_STRUCTURE]', aiErr?.message);
    }
    const log = await maintenanceDashboard.saveShiftTechnicalLog(
      req.user.company_id, req.user.id, content.trim(), structuredData, 'turn_record'
    );
    res.json({ ok: true, log, structured: Object.keys(structuredData).length > 0 });
  } catch (err) {
    console.error('[MAINTENANCE_SHIFT_LOG_AI]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao salvar registro' });
  }
});

/**
 * GET /api/dashboard/maintenance/shift-handovers
 * Lista registros de turno e passagens
 */
router.get('/maintenance/shift-handovers', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    if (!isMaintenanceProfile(req.user)) {
      return res.json({ ok: true, is_maintenance: false, logs: [] });
    }
    const logs = await maintenanceDashboard.getShiftHandovers(req.user.company_id, req.user.id, 10);
    res.json({ ok: true, is_maintenance: true, logs });
  } catch (err) {
    console.error('[MAINTENANCE_SHIFT_HANDOVERS]', err);
    res.status(500).json({ ok: false, error: 'Erro ao buscar registros' });
  }
});

// ============================================================================
// ROTAS LEGADAS (mantidas para compatibilidade)
// ============================================================================

/**
 * GET /api/dashboard/user-context
 * Contexto organizacional do usuário (área, cargo, setor, escopo)
 */
router.get('/user-context', requireAuth, (req, res) => {
  try {
    const ctx = userContext.buildUserContext(req.user);
    res.json({ ok: true, context: ctx });
  } catch (err) {
    console.error('[USER_CONTEXT_ERROR]', err);
    res.status(500).json({ ok: false, error: 'Erro ao buscar contexto' });
  }
});

/**
 * GET /api/dashboard/visibility
 * Retorna seções visíveis + contexto organizacional (personalização por área/cargo)
 */
router.get('/visibility', requireAuth, async (req, res) => {
  try {
    const hierarchyLevel = req.user.hierarchy_level ?? 5;
    const companyId = req.user.company_id;
    const sections = await dashboardVisibility.getVisibilityForUser(hierarchyLevel, companyId);

    const ctx = userContext.buildUserContext(req.user);
    const languageInstruction = userContext.getLanguageInstructions(ctx);
    const combinedFocus = userContext.getCombinedFocus(ctx);

    res.json({
      ok: true,
      sections,
      userContext: ctx,
      languageInstruction,
      focus: combinedFocus
    });
  } catch (err) {
    console.error('[DASHBOARD_VISIBILITY_ERROR]', err);
    res.status(500).json({ ok: false, error: 'Erro ao buscar visibilidade' });
  }
});

/**
 * GET /api/dashboard/kpis
 * Indicadores dinâmicos personalizados por role + department + hierarchy
 */
router.get('/kpis', requireAuth, requireHierarchyScope, async (req, res) => {
  try {
    const dashboardKPIs = require('../services/dashboardKPIs');
    const kpis = await dashboardKPIs.getDashboardKPIs(req.user, req.hierarchyScope);
    res.json({ ok: true, kpis });
  } catch (err) {
    console.error('[DASHBOARD_KPIS_ERROR]', err);
    res.status(500).json({ ok: false, error: 'Erro ao buscar indicadores' });
  }
});

/**
 * POST /api/dashboard/executive-query
 * Consulta estratégica (apenas CEO verificado)
 */
/**
 * POST /api/dashboard/org-ai-assistant
 * Assistente IA Organizacional - perguntas internas/externas com governança
 */
router.post('/org-ai-assistant', requireAuth, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string' || question.trim().length < 3) {
      return res.status(400).json({ ok: false, error: 'Pergunta obrigatória' });
    }
    const orgAI = require('../services/organizationalAI');
    const low = question.toLowerCase();
    const isExternal = /preço|cotação|litro|mercado|quanto está|valor do|aço|óleo/i.test(low);
    const reply = isExternal
      ? await orgAI.answerExternalQuestion(question.trim())
      : await orgAI.answerInternalQuestion(req.user.company_id, question.trim(), req.user);
    res.json({ ok: true, reply });
  } catch (err) {
    console.error('[ORG_AI_ASSISTANT]', err);
    res.status(500).json({ ok: false, error: 'Erro ao processar pergunta' });
  }
});

/**
 * POST /api/dashboard/communication-classify
 * Classifica mensagem e retorna destinatários sugeridos (escalonamento)
 */
router.post('/communication-classify', requireAuth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ ok: false, error: 'Mensagem obrigatória' });
    }
    const escalation = require('../services/communicationEscalation');
    const ctx = userContext.buildUserContext(req.user);
    const result = await escalation.processCommunication(
      message.trim(),
      req.user.company_id,
      ctx
    );
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[COMMUNICATION_CLASSIFY_ERROR]', err);
    res.status(500).json({ ok: false, error: 'Erro ao classificar' });
  }
});

function requireExecutiveForecasting(req, res, next) {
  const role = (req.user?.role || '').toLowerCase();
  const hierarchy = req.user?.hierarchy_level ?? 5;
  if (['ceo', 'diretor'].includes(role) || hierarchy <= 1) return next();
  return res.status(403).json({ ok: false, error: 'Centro de Previsão Operacional restrito a CEO e Diretores.', code: 'FORECASTING_ACCESS_DENIED' });
}

router.post('/executive-query', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'ceo') {
      return res.status(403).json({ ok: false, error: 'Acesso restrito a CEO' });
    }

    const userResult = await db.query(
      'SELECT executive_verified FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!userResult.rows[0]?.executive_verified) {
      return res.status(403).json({
        ok: false,
        error: 'Verificação executiva pendente. Envie o certificado IPC no Chat (anexe documento ou imagem) ou pelo App Impetus para liberar acesso.'
      });
    }

    const { query, modoApresentacao = false } = req.body;
    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return res.status(400).json({ ok: false, error: 'Consulta inválida' });
    }

    const response = await executiveMode.processExecutiveQuery(
      req.user.company_id,
      req.user.id,
      query.trim(),
      !!modoApresentacao
    );

    await executiveMode.logExecutiveAction({
      companyId: req.user.company_id,
      userId: req.user.id,
      action: 'strategic_query_web',
      channel: 'web',
      requestSummary: query.slice(0, 300),
      responseSummary: response?.slice(0, 300),
      metadata: { modoApresentacao: !!modoApresentacao }
    });

    res.json({ ok: true, response });
  } catch (err) {
    console.error('[EXECUTIVE_QUERY_ERROR]', err);
    res.status(500).json({ ok: false, error: 'Erro ao processar consulta' });
  }
});

/* ========== CENTRO DE PREVISÃO OPERACIONAL (CEO/Diretor) ========== */
router.get('/forecasting/projections', requireAuth, requireCompanyActive, requireExecutiveForecasting, async (req, res) => {
  try {
    const metric = req.query.metric || 'eficiencia';
    const data = await operationalForecasting.getProjections(req.user.company_id, metric);
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/forecasting/alerts', requireAuth, requireCompanyActive, requireExecutiveForecasting, async (req, res) => {
  try {
    const alerts = await operationalForecasting.getIntelligentAlerts(req.user.company_id, parseInt(req.query.limit, 10) || 15);
    res.json({ ok: true, alerts });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/forecasting/simulation', requireAuth, requireCompanyActive, requireExecutiveForecasting, async (req, res) => {
  try {
    const hours = parseInt(req.query.hours, 10) || 48;
    const sim = await operationalForecasting.simulateFuture(req.user.company_id, hours);
    res.json({ ok: true, simulation: sim });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/forecasting/health', requireAuth, requireCompanyActive, requireExecutiveForecasting, async (req, res) => {
  try {
    const health = await operationalForecasting.getCompanyHealth(req.user.company_id);
    res.json({ ok: true, health });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/forecasting/ask', requireAuth, requireCompanyActive, requireExecutiveForecasting, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string' || question.trim().length < 5) {
      return res.status(400).json({ ok: false, error: 'Pergunta inválida. Mínimo 5 caracteres.' });
    }
    const response = await operationalForecastingAI.answerOperationalQuestion(req.user.company_id, question.trim());
    res.json({ ok: true, response });
  } catch (err) {
    console.error('[FORECASTING_ASK]', err);
    res.status(500).json({ ok: false, error: err?.message });
  }
});

/* ========== PREVISÃO OPERACIONAL E FINANCEIRA AVANÇADA ========== */
router.get('/forecasting/extended-projections', requireAuth, requireCompanyActive, requireExecutiveForecasting, async (req, res) => {
  try {
    const data = await operationalForecastingAdvanced.getExtendedProjections(req.user.company_id);
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/forecasting/profit-loss', requireAuth, requireCompanyActive, requireExecutiveForecasting, async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 14;
    const data = await operationalForecastingAdvanced.getProfitLossProjection(req.user.company_id, days);
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/forecasting/critical-factors', requireAuth, requireCompanyActive, requireExecutiveForecasting, async (req, res) => {
  try {
    const data = await operationalForecastingAdvanced.getCriticalFactors(req.user.company_id);
    res.json({ ok: true, ...data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/forecasting/simulate-decision', requireAuth, requireCompanyActive, requireExecutiveForecasting, async (req, res) => {
  try {
    const { action, value } = req.body;
    if (!action) return res.status(400).json({ ok: false, error: 'action obrigatória' });
    const data = await operationalForecastingAdvanced.simulateDecision(req.user.company_id, { action, value });
    res.json({ ok: true, simulation: data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/forecasting/config', requireAuth, requireCompanyActive, requireExecutiveForecasting, async (req, res) => {
  try {
    const config = await operationalForecastingAdvanced.getForecastingConfig(req.user.company_id);
    res.json({ ok: true, config });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.put('/forecasting/config', requireAuth, requireCompanyActive, requireExecutiveForecasting, async (req, res) => {
  try {
    const { revenue_per_day, revenue_per_month, efficiency_baseline, production_capacity_utilization } = req.body;
    await operationalForecastingAdvanced.updateForecastingConfig(req.user.company_id, {
      revenue_per_day, revenue_per_month, efficiency_baseline, production_capacity_utilization
    });
    const config = await operationalForecastingAdvanced.getForecastingConfig(req.user.company_id);
    res.json({ ok: true, config });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

/**
 * GET /api/dashboard/summary
 * Resumo geral do dashboard (cache 2 min, filtro hierárquico)
 */
router.get('/summary', requireAuth, requireHierarchyScope, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const filterCtx = dashboardFilter.getFilterContext(req.user);
    const scope = req.hierarchyScope;

    if (!companyId) {
      return res.json({
        ok: true,
        summary: {
          operational_interactions: { total: 0, growth_percentage: 0 },
          ai_insights: { total: 0, growth_percentage: 0 },
          monitored_points: { total: 0 },
          proposals: { total: 0 }
        }
      });
    }

    const scopeKey = scope?.isFullAccess ? 'full'
      : filterCtx.departmentId ? `d:${filterCtx.departmentId}` : `u:${filterCtx.userId}`;

    const summary = await cached(
      'dashboard:summary',
      async () => {
        let comms = { current_week: 0, previous_week: 0 };
        let insights = { current_week: 0, previous_week: 0 };
        let pointsTotal = 0;
        let proposalsTotal = 0;

        const scopeForFilter = scope ? { ...scope, companyId } : filterCtx;
        const commFilter = dashboardFilter.getCommunicationsFilter(scopeForFilter, 'c', 1);
        const commWhere = commFilter.whereClause || `c.company_id = $1`;
        const commParams = commFilter.params.length ? commFilter.params : [companyId];

        try {
          const communicationsResult = await db.query(`
            SELECT COUNT(*) FILTER (WHERE c.created_at >= now() - INTERVAL '1 week') as current_week,
                   COUNT(*) FILTER (WHERE c.created_at >= now() - INTERVAL '2 weeks' AND c.created_at < now() - INTERVAL '1 week') as previous_week
            FROM communications c
            WHERE ${commWhere}
          `, commParams);
          if (communicationsResult.rows[0]) {
            comms = communicationsResult.rows[0];
          }
        } catch (err) {
          try {
            const fallback = await db.query(`
              SELECT COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '1 week') as current_week,
                     COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '2 weeks' AND created_at < now() - INTERVAL '1 week') as previous_week
              FROM communications WHERE company_id = $1
            `, [companyId]);
            comms = fallback.rows[0] || comms;
          } catch {}
        }

        try {
          const insightsResult = await db.query(`
            SELECT COUNT(*) FILTER (WHERE c.ai_priority <= 2 AND c.created_at >= now() - INTERVAL '1 week') as current_week,
                   COUNT(*) FILTER (WHERE c.ai_priority <= 2 AND c.created_at >= now() - INTERVAL '2 weeks' AND c.created_at < now() - INTERVAL '1 week') as previous_week
            FROM communications c
            WHERE ${commWhere}
          `, commParams);
          insights = insightsResult.rows[0] || insights;
        } catch (err) {
          try {
            const fallback = await db.query(`
              SELECT COUNT(*) FILTER (WHERE ai_priority <= 2 AND created_at >= now() - INTERVAL '1 week') as current_week,
                     COUNT(*) FILTER (WHERE ai_priority <= 2 AND created_at >= now() - INTERVAL '2 weeks' AND created_at < now() - INTERVAL '1 week') as previous_week
              FROM communications WHERE company_id = $1
            `, [companyId]);
            insights = fallback.rows[0] || insights;
          } catch {}
        }

        try {
          let pointsFilter = 'company_id = $1 AND active = true';
          const pointsParams = [companyId];
          if (filterCtx.hierarchyLevel >= 4 && filterCtx.departmentId) {
            pointsFilter += ' AND (department_id = $2 OR department_id IS NULL)';
            pointsParams.push(filterCtx.departmentId);
          } else if (filterCtx.hierarchyLevel >= 2 && filterCtx.hierarchyLevel <= 3 && filterCtx.departmentId) {
            pointsFilter += ' AND (department_id = $2 OR department_id IS NULL)';
            pointsParams.push(filterCtx.departmentId);
          }
          const pointsResult = await db.query(
            `SELECT COUNT(*) as total FROM monitored_points WHERE ${pointsFilter}`,
            pointsParams
          );
          pointsTotal = parseInt(pointsResult.rows[0]?.total || 0);
        } catch {
          try {
            const fallback = await db.query(`SELECT COUNT(*) as total FROM monitored_points WHERE company_id = $1 AND active = true`, [companyId]);
            pointsTotal = parseInt(fallback.rows[0]?.total || 0);
          } catch {}
        }

        try {
          let propFilter = 'company_id = $1';
          const propParams = [companyId];
          if (filterCtx.hierarchyLevel >= 4) {
            propFilter += ' AND created_by = $2';
            propParams.push(filterCtx.userId);
          } else if (filterCtx.hierarchyLevel >= 2 && filterCtx.hierarchyLevel <= 3 && filterCtx.departmentId) {
            propFilter += ' AND (department_id = $2 OR department_id IS NULL)';
            propParams.push(filterCtx.departmentId);
          }
          const propResult = await db.query(`SELECT COUNT(*) as total FROM proposals WHERE ${propFilter}`, propParams);
          proposalsTotal = parseInt(propResult.rows[0]?.total || 0);
        } catch {
          try {
            const fallback = await db.query(`SELECT COUNT(*) as total FROM proposals WHERE company_id = $1`, [companyId]);
            proposalsTotal = parseInt(fallback.rows[0]?.total || 0);
          } catch {}
        }

        const commGrowth = comms.previous_week > 0
          ? ((comms.current_week - comms.previous_week) / comms.previous_week * 100).toFixed(1)
          : 0;
        const insightsGrowth = insights.previous_week > 0
          ? ((insights.current_week - insights.previous_week) / insights.previous_week * 100).toFixed(1)
          : 0;

        return {
          operational_interactions: { total: parseInt(comms.current_week || 0), growth_percentage: parseFloat(commGrowth) },
          ai_insights: { total: parseInt(insights.current_week || 0), growth_percentage: parseFloat(insightsGrowth) },
          monitored_points: { total: pointsTotal },
          proposals: { total: proposalsTotal },
          viewType: dashboardFilter.getViewType(filterCtx.hierarchyLevel)
        };
      },
      () => `${companyId}:${scopeKey}`,
      TTL.DASHBOARD_SUMMARY
    );

    res.json({ ok: true, summary });

  } catch (err) {
    console.error('[DASHBOARD_SUMMARY_ERROR]', err);
    res.status(500).json({
      ok: false,
      error: 'Erro ao buscar resumo do dashboard'
    });
  }
});

/**
 * GET /api/dashboard/trend
 * Tendência operacional (gráfico de área) - cache 5 min
 */
router.get('/trend', requireAuth, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const companyId = req.user.company_id;

    const trend = await cached(
      'dashboard:trend',
      async () => {
        const result = await db.query(`
          SELECT 
            DATE_TRUNC('month', created_at) as month,
            COUNT(*) as interactions
          FROM communications
          WHERE company_id = $1
            AND created_at >= now() - ($2 * interval '1 month')
          GROUP BY DATE_TRUNC('month', created_at)
          ORDER BY month ASC
        `, [companyId, months]);
        return result.rows;
      },
      () => `${companyId}:${months}`,
      TTL.DASHBOARD_TREND
    );

    res.json({
      ok: true,
      trend
    });

  } catch (err) {
    console.error('[DASHBOARD_TREND_ERROR]', err);
    res.status(500).json({
      ok: false,
      error: 'Erro ao buscar tendência'
    });
  }
});

/**
 * GET /api/dashboard/insights
 * Insights prioritários da IA - cache 1 min
 */
router.get('/insights', requireAuth, requireHierarchyScope, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = Math.max(0, parseInt(req.query.offset) || 0);
    const filterCtx = dashboardFilter.getFilterContext(req.user);
    const scope = req.hierarchyScope;
    const scopeKey = scope?.isFullAccess ? 'full'
      : filterCtx.departmentId ? `d:${filterCtx.departmentId}` : `u:${filterCtx.userId}`;

    const insights = await cached(
      'dashboard:insights',
      async () => {
        const scopeForFilter = scope ? { ...scope, companyId } : filterCtx;
        const commFilter = dashboardFilter.getCommunicationsFilter(scopeForFilter, 'c', 1);
        const commWhere = commFilter.whereClause || 'c.company_id = $1';
        const pLimit = commFilter.paramOffset;
        const pOffset = pLimit + 1;
        const params = [...commFilter.params, limit, offset];
        const result = await db.query(`
          SELECT 
            c.id,
            c.text_content,
            c.ai_classification,
            c.ai_priority,
            c.ai_sentiment,
            c.created_at,
            c.related_equipment_id
          FROM communications c
          WHERE ${commWhere}
            AND c.ai_priority <= 2
            AND (c.status IS NULL OR c.status != 'resolved')
          ORDER BY c.ai_priority ASC, c.created_at DESC
          LIMIT $${pLimit} OFFSET $${pOffset}
        `, params);

        return result.rows.map(row => ({
      id: row.id,
      title: row.ai_classification?.type || 'Insight',
      description: row.text_content?.substring(0, 100),
      severity: row.ai_priority === 1 ? 'crítico' : 'alto',
          impact: row.ai_sentiment === 'urgente' ? 'Alto' : 'Médio',
          reference: `Ref: ${row.id.substring(0, 11)}`,
          created_at: row.created_at
        }));
      },
      () => `${companyId}:${scopeKey}:${limit}:${offset}`,
      TTL.DASHBOARD_INSIGHTS
    );

    res.json({
      ok: true,
      insights
    });

  } catch (err) {
    console.error('[DASHBOARD_INSIGHTS_ERROR]', err);
    res.status(500).json({
      ok: false,
      error: 'Erro ao buscar insights'
    });
  }
});

/**
 * GET /api/dashboard/monitored-points-distribution
 * Distribuição de pontos monitorados - cache 5 min
 */
router.get('/monitored-points-distribution', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const distribution = await cached(
      'dashboard:points',
      async () => {
        const result = await db.query(`
          SELECT 
            type,
            COUNT(*) as count
          FROM monitored_points
          WHERE company_id = $1 AND active = true
          GROUP BY type
          ORDER BY count DESC
        `, [companyId]);
        return result.rows;
      },
      () => companyId,
      TTL.DASHBOARD_POINTS
    );

    res.json({
      ok: true,
      distribution
    });

  } catch (err) {
    console.error('[DASHBOARD_POINTS_DISTRIBUTION_ERROR]', err);
    res.status(500).json({
      ok: false,
      error: 'Erro ao buscar distribuição'
    });
  }
});

/**
 * GET /api/dashboard/recent-interactions
 * Interações recentes (feed) - cache 1 min (filtro hierárquico)
 */
router.get('/recent-interactions', requireAuth, requireHierarchyScope, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = Math.max(0, parseInt(req.query.offset) || 0);
    const companyId = req.user.company_id;
    const filterCtx = dashboardFilter.getFilterContext(req.user);
    const scope = req.hierarchyScope;
    const scopeKey = scope?.isFullAccess ? 'full'
      : filterCtx.departmentId ? `d:${filterCtx.departmentId}` : `u:${filterCtx.userId}`;

    const interactions = await cached(
      'dashboard:interactions',
      async () => {
        const scopeForFilter = scope ? { ...scope, companyId } : filterCtx;
        const commFilter = dashboardFilter.getCommunicationsFilter(scopeForFilter, 'c', 1);
        const commWhere = commFilter.whereClause || 'c.company_id = $1';
        const pLimit = commFilter.paramOffset;
        const pOffset = pLimit + 1;
        const params = [...commFilter.params, limit, offset];
        const result = await db.query(`
          SELECT 
            c.id,
            c.source,
            c.text_content,
            c.created_at,
            u.name as sender_name,
            u.avatar_url
          FROM communications c
          LEFT JOIN users u ON c.sender_id = u.id
          WHERE ${commWhere}
          ORDER BY c.created_at DESC
          LIMIT $${pLimit} OFFSET $${pOffset}
        `, params);
        return result.rows.map(r => ({ ...r, text: r.text_content }));
      },
      () => `${companyId}:${scopeKey}:${limit}:${offset}`,
      TTL.DASHBOARD_INTERACTIONS
    );

    res.json({
      ok: true,
      interactions
    });

  } catch (err) {
    console.error('[DASHBOARD_RECENT_INTERACTIONS_ERROR]', err);
    res.status(500).json({
      ok: false,
      error: 'Erro ao buscar interações recentes'
    });
  }
});

/**
 * POST /api/dashboard/log-activity
 * Registra atividade do usuário (buscas, visualizações, contexto)
 */
router.post('/log-activity', requireAuth, async (req, res) => {
  try {
    const { activity_type, entity_type, entity_id, context } = req.body;
    if (!activity_type) {
      return res.status(400).json({ ok: false, error: 'activity_type obrigatório' });
    }
    await db.query(`
      INSERT INTO user_activity_logs (user_id, company_id, activity_type, entity_type, entity_id, context)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      req.user.id,
      req.user.company_id,
      activity_type,
      entity_type || null,
      entity_id || null,
      context ? JSON.stringify(context) : '{}'
    ]);
    res.json({ ok: true });
  } catch (err) {
    if (err.message?.includes('does not exist')) {
      return res.json({ ok: true }); // Tabela pode não existir ainda
    }
    console.error('[LOG_ACTIVITY]', err);
    res.status(500).json({ ok: false, error: 'Erro ao registrar atividade' });
  }
});

/**
 * GET /api/dashboard/smart-summary
 * Resumo Inteligente Diário/Semanal - IA analisa histórico + dados da fábrica
 * Sexta-feira: relatório semanal. Demais dias: relatório diário.
 */
router.get('/smart-summary', requireAuth, async (req, res) => {
  try {
    const result = await smartSummary.buildSmartSummary(
      req.user.id,
      req.user.name,
      req.user.company_id,
      req.user
    );
    res.json({
      ok: true,
      ...result
    });
  } catch (err) {
    console.error('[SMART_SUMMARY_ERROR]', err);
    res.status(500).json({
      ok: false,
      error: 'Erro ao gerar resumo',
      fallback: 'Resumo temporariamente indisponível.'
    });
  }
});

/** Resposta de fallback quando IA indisponível */
const CHAT_FALLBACK_IMPETUS = `No momento o serviço está temporariamente indisponível. O Impetus auxilia em comunicação inteligente, manutenção assistida, Pró-Ação e documentação em contexto. Entre em contato com o suporte para configurar a API.`;

/**
 * POST /api/dashboard/chat
 * Fluxo: Auth → Company → Prompt Firewall → Rate Limit → Authorize → Secure Context → OpenAI → Audit
 * A IA nunca decide permissões. Toda decisão no backend.
 */
router.post('/chat',
  requireAuth,
  requireCompanyActive,
  promptFirewall,
  userRateLimit('ai_chat'),
  async (req, res) => {
    if (req.promptFirewall?.blocked) {
      await aiAudit.logAIInteraction({
        userId: req.user?.id,
        companyId: req.user?.company_id,
        action: 'chat',
        question: req.body?.message,
        blocked: true,
        blockReason: req.promptFirewall.reason,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      return res.status(403).json({
        ok: false,
        error: req.promptFirewall.message || 'Você não possui permissão para acessar informações estratégicas.',
        code: 'PROMPT_BLOCKED'
      });
    }

    // Verificação de identificação desativada (sistema de onboarding próprio ativo)

    let reply = '';
    try {
      const { message, history = [] } = req.body;
    // Verificação de dados sigilosos
    const sensitivePatterns = [
      /senha/i, /password/i, /credencial/i,
      /dados pessoais/i, /cpf/i, /rg/i, /salario/i, /salário/i,
      /folha de pagamento/i, /financeiro confidencial/i, /contrato confidencial/i,
      /dados bancários/i, /conta bancária/i, /chave pix/i,
      /token/i, /api.?key/i, /secret/i
    ];
    const isSensitive = sensitivePatterns.some(p => p.test(message));
    if (isSensitive) {
      const passwordVerified = req.headers['x-password-verified'] === 'true';
      if (!passwordVerified) {
        return res.status(403).json({
          ok: false,
          error: 'Conteúdo sigiloso detectado.',
          code: 'SENSITIVE_CONTENT',
          requirePasswordVerification: true
        });
      }
    }

      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ ok: false, error: 'Mensagem obrigatória' });
      }
      const companyId = req.user.company_id;
      const chatCtx = await chatUserContext.buildChatUserContext(req.user);
      const { userName, identityBlock, memoriaBlock } = chatCtx;

      let operationalMemoryBlock = '';
      try {
        const ctxPromise = claudeAnalytics.getContextForChat({
          companyId,
          userId: req.user?.id,
          query: message,
          req
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), 6000)
        );
        operationalMemoryBlock = (await Promise.race([ctxPromise, timeoutPromise])) || '';
      } catch (e) {
        if (e?.message !== 'TIMEOUT') console.warn('[CHAT] getContextForChat:', e?.message);
      }

      let docContext = '';
      let manualsBlock = '(Nenhum trecho relevante)';
      let langInstruction = '';

      try {
        const ctx = userContext.buildUserContext(req.user);
        langInstruction = userContext.getLanguageInstructions(ctx) || '';
      } catch (_) {}

      try {
        const secureCtx = await secureContextBuilder.buildContext(req.user, { companyId, queryText: message });
        docContext = secureCtx.context || '';
      } catch (err) {
        try {
          docContext = await documentContext.buildAIContext({ companyId, queryText: message }) || '';
        } catch (e) {
          console.warn('[CHAT] buildAIContext:', e.message);
        }
      }

      try {
        const manuals = await documentContext.searchCompanyManuals(companyId, message, 6);
        if (manuals.length > 0) {
          manualsBlock = manuals.map((m, i) => `[${i + 1}] ${m.title}: ${(m.chunk_text || '').slice(0, 400)}`).join('\n---\n');
        }
      } catch (err) {
        console.warn('[CHAT] searchCompanyManuals:', err.message);
      }

      const historyBlock = (Array.isArray(history) ? history.slice(-6) : []).map((m) => {
        const role = m.role === 'user' ? userName : 'IA';
        return `${role}: ${(m.content || '').slice(0, 300)}`;
      }).join('\n');

      const IMPETUS_CAPABILITIES = `
## O que o Impetus oferece (apresente APENAS quando perguntarem "o que é" ou "o que faz"):
- **Comunicação Rastreada Inteligente** – Integração WhatsApp, mensagens operacionais, tarefas e diagnósticos
- **Pró-Ação (Melhoria Contínua)** – Propostas de melhoria avaliadas por IA, acompanhamento de projetos
- **Manutenção Assistida** – Análise de falhas com base em manuais, POPs e políticas da empresa
- **Insights e KPIs** – Resumos diários, tendências e indicadores por área
- **Documentação em contexto** – A IA sempre consulta POPs, políticas e manuais internos`;

    const COMMUNICATION_GUIDELINES = `
## Estilo de comunicação – OBRIGATÓRIO:
- **Seja natural e direto.** O usuário já sabe quem você é – NÃO repita "Olá! Aqui é o Impetus" ou "Sou o Impetus" em toda mensagem.
- **Identifique-se apenas** na primeira interação da sessão ou quando o usuário perguntar diretamente quem você é.
- **Responda de forma conversacional**, como um assistente experiente que já conhece o contexto.
- **Seja conciso** quando a pergunta for objetiva. Evite rodeios e frases de preenchimento.
- **Nunca exponha** dados sensíveis, salários, contratos, informações restritas de pessoas ou da organização. Seja cauteloso com dados financeiros e estratégicos.
- **Evite encerrar** todas as mensagens com "Como posso ajudar?" ou "Estou à disposição" – use apenas quando fizer sentido.`;

    const MAINTENANCE_CONTEXT = isMaintenanceProfile(req.user) ? `
## PERFIL TÉCNICO (Mecânico / Manutenção):
O usuário trabalha em manutenção industrial. Priorize:
- **Diagnóstico de falhas**: sintomas, possíveis causas, passos de verificação prática
- **Histórico da máquina**: intervenções anteriores, causas recorrentes, soluções já aplicadas
- **Manuais técnicos**: procedimentos, verificações, especificações – consulte os trechos abaixo
- **Ordem de serviço**: apoio em registro técnico, passagem de turno, resumo de intervenção
- **Estilo**: objetivo, técnico, prático, orientado para ação. Evite teoria excessiva; foque em "o que verificar" e "como executar".
- Quando perguntas forem sobre falhas, máquinas ou manutenção, busque nos manuais e sugira ações concretas.` : '';

    const systemPrompt = `Você é o **Impetus**, assistente de inteligência operacional industrial. Quando precisar se identificar, use apenas o nome "Impetus".

${identityBlock}
${memoriaBlock}
${operationalMemoryBlock ? `\n${operationalMemoryBlock}\n` : ''}
${MAINTENANCE_CONTEXT}

**IMPORTANTE:** Comunicação natural. O usuário já está na plataforma e sabe com quem fala. Responda de forma direta e útil, sem repetir saudações ou apresentações em cada mensagem.
${COMMUNICATION_GUIDELINES}
${IMPETUS_CAPABILITIES}
${langInstruction ? `\n${langInstruction}` : ''}
${docContext ? `\n${docContext}\n` : ''}
## Trechos de manuais/POPs (se relevantes):
${manualsBlock}`;

    const userPrompt = historyBlock
      ? `Histórico recente:\n${historyBlock}\n\n${userName}: ${message.trim()}`
      : `${userName}: ${message.trim()}`;

    const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}\n\nResponda de forma natural e direta, em português. Não repita saudações ou "Como posso ajudar?". Seja conciso e útil.`;

    if (process.env.AI_ORCHESTRATOR_ENABLED === 'true') {
      try {
        const aiOrchestrator = require('../services/aiOrchestratorService');
        const extraContext = [
          identityBlock,
          memoriaBlock,
          operationalMemoryBlock,
          docContext ? `Documentação em contexto:\n${docContext}` : '',
          `Manuais/POPs:\n${manualsBlock}`,
          MAINTENANCE_CONTEXT || ''
        ].filter(Boolean).join('\n\n');
        reply = await aiOrchestrator.processWithOrchestrator({
          message: message.trim(),
          history: Array.isArray(history) ? history : [],
          imageBase64: null,
          companyId,
          userName: chatCtx.userName || 'Usuário',
          extraContext
        });
      } catch (orchErr) {
        console.warn('[CHAT] Orchestrator fallback:', orchErr.message);
      }
    }

    if (!reply) {
      reply = await ai.chatCompletion(fullPrompt, { max_tokens: 800 });
    }

    const isFallback = (reply || '').startsWith('FALLBACK:');
    if (isFallback) {
      reply = CHAT_FALLBACK_IMPETUS;
    }

    const finalReply = (reply || '').trim() || 'Desculpe, não consegui processar. Tente novamente.';
    await aiAudit.logAIInteraction({
      userId: req.user?.id,
      companyId: req.user?.company_id,
      action: 'chat',
      question: message,
      response: finalReply,
      blocked: false,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    claudeAnalytics.ingestChatImpetus(message, history, req.user?.company_id, req.user?.id);

    return res.json({ ok: true, reply: finalReply });
  } catch (err) {
    console.error('[CHAT_ERROR]', err);
    await aiAudit.logAIInteraction({
      userId: req.user?.id,
      companyId: req.user?.company_id,
      action: 'chat',
      question: req.body?.message,
      blocked: false,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    }).catch(() => {});
    return res.json({
      ok: true,
      reply: CHAT_FALLBACK_IMPETUS
    });
  }
  });

// ============================================================================
// CHAT MULTIMODAL - Imagem, arquivo, voz
// ============================================================================

const chatMultimodalStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    multimodalChat.ensureUploadDir();
    cb(null, multimodalChat.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.bin';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});
const chatMultimodalUpload = multer({
  storage: chatMultimodalStorage,
  limits: { fileSize: multimodalChat.MAX_FILE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = (path.extname(file.originalname || '') || '').toLowerCase();
    const allowed = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.gif', '.webp'];
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Tipo de arquivo não suportado. Use PDF, DOC, XLS ou imagem.'));
  }
});

/**
 * POST /api/dashboard/chat/upload-file
 * Upload de arquivo para contexto do chat (PDF, DOC, imagem)
 */
router.post('/chat/upload-file',
  requireAuth,
  requireCompanyActive,
  userRateLimit('ai_chat'),
  chatMultimodalUpload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ ok: false, error: 'Arquivo obrigatório' });
      }
      const result = await multimodalChat.processUploadedFile(
        req.file.path,
        req.file.originalname,
        req.user.company_id
      );
      if (result.type === 'image') {
        const buf = fs.readFileSync(result.filePath);
        const base64 = buf.toString('base64');
        return res.json({
          ok: true,
          type: 'image',
          imageBase64: base64,
          originalName: result.originalName
        });
      }
      res.json({
        ok: true,
        type: 'document',
        fileContext: {
          extractedText: result.extractedText,
          originalName: result.originalName
        }
      });
    } catch (err) {
      console.error('[CHAT_UPLOAD_FILE]', err);
      res.status(500).json({ ok: false, error: err.message || 'Erro ao processar arquivo' });
    }
  }
);

/**
 * POST /api/dashboard/chat-multimodal
 * Chat com suporte a imagem (base64) e contexto de arquivo
 */
router.post('/chat-multimodal',
  requireAuth,
  requireCompanyActive,
  promptFirewall,
  userRateLimit('ai_chat'),
  async (req, res) => {
    if (req.promptFirewall?.blocked) {
      return res.status(403).json({
        ok: false,
        error: req.promptFirewall.message || 'Acesso bloqueado',
        code: 'PROMPT_BLOCKED'
      });
    }
    try {
      const { message, history = [], imageBase64, fileContext } = req.body;
      const companyId = req.user.company_id;
      const chatCtx = await chatUserContext.buildChatUserContext(req.user);
      const { userName } = chatCtx;

      let maintenanceExtra = '';
      if (isMaintenanceProfile(req.user)) {
        maintenanceExtra = `Perfil técnico/manutenção: priorize diagnóstico de falhas, análise de imagens de máquinas/peças, orientação prática.`;
      }

      let reply = null;
      if (process.env.AI_ORCHESTRATOR_ENABLED === 'true' && (imageBase64 || message)) {
        try {
          const aiOrchestrator = require('../services/aiOrchestratorService');
          let extraContext = maintenanceExtra;
          if (fileContext?.extractedText) {
            extraContext += `\n\nDocumento anexado (${fileContext.originalName || 'arquivo'}):\n${(fileContext.extractedText || '').slice(0, 8000)}`;
          }
          reply = await aiOrchestrator.processWithOrchestrator({
            message: message || 'Analise o conteúdo anexado.',
            history: Array.isArray(history) ? history : [],
            imageBase64: imageBase64 || null,
            companyId,
            userName,
            extraContext
          });
        } catch (orchErr) {
          console.warn('[CHAT_MULTIMODAL] Orchestrator fallback:', orchErr.message);
        }
      }
      if (!reply) {
        reply = await multimodalChat.processMultimodalChat({
        message: message || '',
        history,
        imageBase64: imageBase64 || null,
        fileContext: fileContext || null,
        companyId,
        userName,
        systemPromptExtra: maintenanceExtra
      });
      }

      const finalReply = (reply || '').trim() || 'Desculpe, não consegui processar. Tente novamente.';
      const isFallback = finalReply.startsWith('FALLBACK:');

      await aiAudit.logAIInteraction({
        userId: req.user?.id,
        companyId,
        action: 'chat_multimodal',
        question: `${message || ''}${imageBase64 ? ' [imagem]' : ''}${fileContext ? ' [arquivo]' : ''}`,
        response: finalReply,
        blocked: false,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      return res.json({
        ok: true,
        reply: isFallback ? CHAT_FALLBACK_IMPETUS : finalReply
      });
    } catch (err) {
      console.error('[CHAT_MULTIMODAL_ERROR]', err);
      return res.json({
        ok: true,
        reply: CHAT_FALLBACK_IMPETUS
      });
    }
  }
);

router.get('/audio/profiles', requireAuth, requireCompanyActive, requireIndustrialView, async (req, res) => {
  try {
    const profiles = await audioMonitoring.listProfiles(req.user.company_id);
    res.json({ ok: true, profiles });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/audio/profiles', requireAuth, requireCompanyActive, requireIndustrialAdmin, async (req, res) => {
  try {
    const { equipamento, linha, profileData } = req.body;
    const p = await audioMonitoring.registerProfile({ companyId: req.user.company_id, equipamento, linha, profileData: profileData || { baselineVolume: 0 } });
    res.json({ ok: true, profile: p });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/audio/sample', requireAuth, requireCompanyActive, requireIndustrialView, async (req, res) => {
  try {
    const { profileId, equipamento, linha, volume, frequency, metadata } = req.body;
    const r = await audioMonitoring.processSample({ companyId: req.user.company_id, profileId, equipamento, linha, volume, frequency, metadata });
    res.json({ ok: true, ...r });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/audio/events', requireAuth, requireCompanyActive, requireIndustrialView, async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
    const events = await audioMonitoring.listRecentEvents(req.user.company_id, limit);
    res.json({ ok: true, events });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

// ============================================================================
// CÉREBRO OPERACIONAL - Painel de Inteligência Operacional
// ============================================================================

router.get('/operational-brain/summary', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const summary = await operationalBrain.getOperationalSummary(req.user.company_id, {
      since: req.query.since,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 50
    });
    res.json({ ok: true, ...summary });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/operational-brain/knowledge-map', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const mapa = await operationalKnowledgeMap.getKnowledgeMap(req.user.company_id);
    res.json({ ok: true, mapa });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/operational-brain/insights', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 30);
    const categoria = req.query.categoria || null;
    const insights = await operationalInsights.listRecent(req.user.company_id, { limit, categoria });
    res.json({ ok: true, insights });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/operational-brain/insights/:id/read', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    await operationalInsights.markAsRead(req.params.id, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/operational-brain/alerts', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 30);
    const alerts = await operationalAlerts.listPending(req.user.company_id, { limit });
    res.json({ ok: true, alerts });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/operational-brain/alerts/:id/resolve', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    await operationalAlerts.resolve(req.params.id, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/operational-brain/timeline', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
    const since = req.query.since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const timeline = await operationalAlerts.getTimeline(req.user.company_id, { limit, since });
    res.json({ ok: true, timeline });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/operational-brain/check-alerts', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const created = await operationalBrain.checkAlerts(req.user.company_id);
    res.json({ ok: true, created: created.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/industrial/status', requireAuth, requireCompanyActive, requireIndustrialView, async (req, res) => {
  try {
    const [profiles, events, automation, interventions, offline, predictions] = await Promise.all([
      machineBrain.listProfiles(req.user.company_id),
      db.query(`SELECT event_type, machine_name, line_name, severity, description, created_at, acknowledged FROM machine_detected_events WHERE company_id = $1 ORDER BY created_at DESC LIMIT 30`, [req.user.company_id]),
      machineControl.getAutomationConfig(req.user.company_id),
      machineSafety.listActiveInterventions(req.user.company_id),
      industrialOperationalMap.getOfflineEquipment(req.user.company_id).catch(() => []),
      industrialOperationalMap.getFailurePredictions(req.user.company_id, 10).catch(() => [])
    ]);
    const recentEvents = events.rows || [];
    res.json({
      ok: true, machines_count: profiles.length, profiles, events: recentEvents,
      automation_mode: automation.automation_mode, interventions_active: interventions,
      offline_equipment: offline, failure_predictions: predictions
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/industrial/events', requireAuth, requireCompanyActive, requireIndustrialView, async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 30);
    const r = await db.query(`SELECT * FROM machine_detected_events WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2`, [req.user.company_id, limit]);
    res.json({ ok: true, events: r.rows || [] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/industrial/profiles', requireAuth, requireCompanyActive, requireIndustrialView, async (req, res) => {
  try {
    const profiles = await machineBrain.listProfiles(req.user.company_id);
    res.json({ ok: true, profiles });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/industrial/automation', requireAuth, requireCompanyActive, requireIndustrialView, async (req, res) => {
  try {
    const cfg = await machineControl.getAutomationConfig(req.user.company_id);
    res.json({ ok: true, ...cfg, can_configure: canConfigureIndustrial(req.user) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/industrial/automation', requireAuth, requireCompanyActive, requireIndustrialAdmin, async (req, res) => {
  try {
    const { mode } = req.body;
    const r = await machineControl.setAutomationMode(req.user.company_id, req.user.id, mode);
    res.json(r.ok ? { ok: true } : { ok: false, error: r.error });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/industrial/command', requireAuth, requireCompanyActive, requireIndustrialView, async (req, res) => {
  try {
    const { machine_id, machine_name, equipment_type, command_type, command_value } = req.body;
    const mid = (machine_id ?? '').toString().trim();
    if (!mid) return res.status(400).json({ ok: false, error: 'machine_id obrigatório', code: 'INVALID_PARAMS' });
    const r = await machineControl.requestCommand(req.user.company_id, req.user.id, mid, machine_name, equipment_type, command_type || 'toggle', command_value, 'user');
    res.json(r);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/industrial/intervention', requireAuth, requireCompanyActive, requireIndustrialView, async (req, res) => {
  try {
    const { machine_identifier, machine_name, intervention_type } = req.body;
    if (!machine_identifier) return res.status(400).json({ ok: false, error: 'machine_identifier obrigatório' });
    const r = await machineSafety.registerIntervention(
      req.user.company_id, machine_identifier, machine_name,
      req.user.id, req.user.name, intervention_type
    );
    res.json({ ok: true, intervention: r });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/industrial/intervention/:id/confirm-safety', requireAuth, requireCompanyActive, requireIndustrialView, async (req, res) => {
  try {
    await machineSafety.confirmSafetySteps(req.user.company_id, req.params.id, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/industrial/release', requireAuth, requireCompanyActive, requireIndustrialView, async (req, res) => {
  try {
    const { machine_identifier } = req.body;
    if (!machine_identifier) return res.status(400).json({ ok: false, error: 'machine_identifier obrigatório' });
    const r = await machineSafety.releaseEquipment(req.user.company_id, machine_identifier, req.user.id, req.user.name);
    if (!r) return res.status(404).json({ ok: false, error: 'Nenhuma intervenção ativa para este equipamento' });
    res.json({ ok: true, released: r });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/industrial/interventions', requireAuth, requireCompanyActive, requireIndustrialView, async (req, res) => {
  try {
    const active = await machineSafety.listActiveInterventions(req.user.company_id);
    const history = await machineSafety.listInterventionHistory(req.user.company_id, req.query.machine_id, parseInt(req.query.limit, 10) || 30);
    res.json({ ok: true, active, history });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/industrial/safety-instructions', requireAuth, requireCompanyActive, requireIndustrialView, (req, res) => {
  res.json({ ok: true, instructions: machineSafety.getSafetyInstructions() });
});

router.get('/industrial/factory-map', requireAuth, requireCompanyActive, requireIndustrialView, async (req, res) => {
  try {
    const map = await industrialOperationalMap.getFactoryMap(req.user.company_id);
    res.json({ ok: true, ...map });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/industrial/offline-equipment', requireAuth, requireCompanyActive, requireIndustrialView, async (req, res) => {
  try {
    const offline = await industrialOperationalMap.getOfflineEquipment(req.user.company_id);
    res.json({ ok: true, offline });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/industrial/predictions', requireAuth, requireCompanyActive, requireIndustrialView, async (req, res) => {
  try {
    const predictions = await industrialOperationalMap.getFailurePredictions(req.user.company_id, 20);
    res.json({ ok: true, predictions });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

/* ========== CENTRO DE CUSTOS INDUSTRIAIS ========== */
router.get('/costs/categories', requireAuth, requireCompanyActive, requireIndustrialCostAdmin, (req, res) => {
  res.json({ ok: true, categories: industrialCost.getCategories() });
});

router.get('/costs/items', requireAuth, requireCompanyActive, requireIndustrialCostAdmin, async (req, res) => {
  try {
    const items = await industrialCost.listCostItems(req.user.company_id);
    res.json({ ok: true, items });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/costs/items', requireAuth, requireCompanyActive, requireIndustrialCostAdmin, async (req, res) => {
  try {
    const r = await industrialCost.upsertCostItem(req.user.company_id, req.body);
    res.json({ ok: true, ...r });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.put('/costs/items/:id', requireAuth, requireCompanyActive, requireIndustrialCostAdmin, async (req, res) => {
  try {
    const r = await industrialCost.upsertCostItem(req.user.company_id, { ...req.body, id: req.params.id });
    res.json({ ok: true, ...r });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.delete('/costs/items/:id', requireAuth, requireCompanyActive, requireIndustrialCostAdmin, async (req, res) => {
  try {
    await industrialCost.deleteCostItem(req.user.company_id, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/costs/executive-summary', requireAuth, requireCompanyActive, requireIndustrialCostView, async (req, res) => {
  try {
    const summary = await industrialCost.getExecutiveCostSummary(req.user.company_id, req.query.period || 'day');
    res.json({ ok: true, ...summary });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/costs/by-origin', requireAuth, requireCompanyActive, requireIndustrialCostView, async (req, res) => {
  try {
    const byOrigin = await industrialCost.getCostByOrigin(req.user.company_id);
    res.json({ ok: true, by_origin: byOrigin });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/costs/top-loss', requireAuth, requireCompanyActive, requireIndustrialCostView, async (req, res) => {
  try {
    const report = await industrialCost.getTopLossReport(req.user.company_id);
    res.json({ ok: true, ...report });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/costs/projected-loss', requireAuth, requireCompanyActive, requireIndustrialCostView, async (req, res) => {
  try {
    const hours = parseInt(req.query.hours, 10) || 48;
    const proj = await industrialCost.getProjectedLoss(req.user.company_id, hours);
    res.json({ ok: true, ...proj });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

/* ========== MAPA DE VAZAMENTO FINANCEIRO ========== */
/* CEO/Diretor: valores | Supervisor/outros: alertas operacionais sem valores */
function requireLeakAccess(req, res, next) {
  const role = (req.user?.role || '').toLowerCase();
  const allowed = ['ceo', 'diretor', 'admin', 'internal_admin', 'gerente', 'coordenador', 'supervisor'];
  if (allowed.includes(role)) return next();
  return res.status(403).json({ ok: false, error: 'Acesso ao Mapa de Vazamento restrito.', code: 'LEAK_ACCESS_DENIED' });
}

router.get('/financial-leakage/map', requireAuth, requireCompanyActive, requireLeakAccess, async (req, res) => {
  try {
    const includeFinancial = financialLeakage.canViewFinancial(req.user?.role, req.user?.hierarchy_level);
    const map = await financialLeakage.getLeakMap(req.user.company_id, includeFinancial);
    res.json({ ok: true, map, include_financial: includeFinancial });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/financial-leakage/ranking', requireAuth, requireCompanyActive, requireLeakAccess, async (req, res) => {
  try {
    const includeFinancial = financialLeakage.canViewFinancial(req.user?.role, req.user?.hierarchy_level);
    const ranking = await financialLeakage.getLeakRanking(req.user.company_id, includeFinancial);
    res.json({ ok: true, ranking, include_financial: includeFinancial });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/financial-leakage/alerts', requireAuth, requireCompanyActive, requireLeakAccess, async (req, res) => {
  try {
    const includeFinancial = financialLeakage.canViewFinancial(req.user?.role, req.user?.hierarchy_level);
    const limit = parseInt(req.query.limit, 10) || 10;
    const alerts = await financialLeakage.getAlerts(req.user.company_id, limit, includeFinancial);
    res.json({ ok: true, alerts, include_financial: includeFinancial });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/financial-leakage/report', requireAuth, requireCompanyActive, requireLeakAccess, async (req, res) => {
  try {
    const includeFinancial = financialLeakage.canViewFinancial(req.user?.role, req.user?.hierarchy_level);
    const report = await financialLeakage.generateAIReport(req.user.company_id, includeFinancial);
    res.json({ ok: true, report, include_financial: includeFinancial });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/financial-leakage/projected-impact', requireAuth, requireCompanyActive, requireLeakAccess, async (req, res) => {
  try {
    const includeFinancial = financialLeakage.canViewFinancial(req.user?.role, req.user?.hierarchy_level);
    const days = parseInt(req.query.days, 10) || 30;
    const proj = await financialLeakage.getProjectedImpact(req.user.company_id, days, includeFinancial);
    res.json({ ok: true, ...proj, include_financial: includeFinancial });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/industrial/machines', requireAuth, requireCompanyActive, requireIndustrialView, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT id, machine_identifier, machine_name, line_name, machine_source, data_source_type,
             collection_interval_sec, enabled, last_collected_at, created_at
      FROM machine_monitoring_config WHERE company_id = $1 ORDER BY machine_name
    `, [req.user.company_id]);
    res.json({ ok: true, machines: r.rows || [] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/industrial/machines', requireAuth, requireCompanyActive, requireIndustrialAdmin, async (req, res) => {
  try {
    const { machine_identifier, machine_name, line_name, machine_source, data_source_type, data_source_config, collection_interval_sec } = req.body;
    const src = machine_source || 'plc_equipment';
    const interval = Math.min(60, Math.max(1, parseInt(collection_interval_sec, 10) || 3));
    await db.query(`
      INSERT INTO machine_monitoring_config (company_id, machine_identifier, machine_name, line_name, machine_source, data_source_type, data_source_config, collection_interval_sec)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (company_id, machine_source, machine_identifier) DO UPDATE SET
        machine_name = EXCLUDED.machine_name, line_name = EXCLUDED.line_name,
        data_source_type = EXCLUDED.data_source_type, data_source_config = EXCLUDED.data_source_config,
        collection_interval_sec = EXCLUDED.collection_interval_sec, updated_at = now()
    `, [req.user.company_id, machine_identifier || `EQ-${Date.now()}`, machine_name, line_name, src, data_source_type || 'plc', JSON.stringify(data_source_config || {}), interval]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.put('/industrial/machines/:id', requireAuth, requireCompanyActive, requireIndustrialAdmin, async (req, res) => {
  try {
    const { machine_name, line_name, data_source_type, data_source_config, collection_interval_sec, enabled } = req.body;
    const updates = [];
    const params = [req.params.id, req.user.company_id];
    let idx = 3;
    if (machine_name !== undefined) { updates.push(`machine_name = $${idx}`); params.push(machine_name); idx++; }
    if (line_name !== undefined) { updates.push(`line_name = $${idx}`); params.push(line_name); idx++; }
    if (data_source_type !== undefined) { updates.push(`data_source_type = $${idx}`); params.push(data_source_type); idx++; }
    if (data_source_config !== undefined) { updates.push(`data_source_config = $${idx}`); params.push(JSON.stringify(data_source_config)); idx++; }
    if (collection_interval_sec !== undefined) { updates.push(`collection_interval_sec = $${idx}`); params.push(Math.min(60, Math.max(1, parseInt(collection_interval_sec, 10) || 3))); idx++; }
    if (enabled !== undefined) { updates.push(`enabled = $${idx}`); params.push(!!enabled); idx++; }
    if (!updates.length) return res.json({ ok: true });
    updates.push('updated_at = now()');
    await db.query(`UPDATE machine_monitoring_config SET ${updates.join(', ')} WHERE id = $1 AND company_id = $2`, params);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.delete('/industrial/machines/:id', requireAuth, requireCompanyActive, requireIndustrialAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM machine_monitoring_config WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

module.exports = router;
