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
const maintenanceDashboard = require('../services/maintenanceDashboardService');
const multimodalChat = require('../services/multimodalChatService');

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

    reply = await ai.chatCompletion(fullPrompt, { max_tokens: 800 });

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

      const reply = await multimodalChat.processMultimodalChat({
        message: message || '',
        history,
        imageBase64: imageBase64 || null,
        fileContext: fileContext || null,
        companyId,
        userName,
        systemPromptExtra: maintenanceExtra
      });

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

module.exports = router;
