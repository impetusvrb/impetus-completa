/**
 * IMPETUS - Rotas do dashboard (perfil, módulos visíveis, layout personalizado, inteligência por utilizador)
 */
const express = require('express');
const { z } = require('zod');
const router = express.Router();
const requireAuth = require('../middleware/auth').requireAuth;
const db = require('../db');
const dashboardPersonalizadoService = require('../services/dashboardPersonalizadoService');
const dashboardMaintenanceRouter = require('./dashboardMaintenance');
const dashboardProfileResolver = require('../services/dashboardProfileResolver');
const dashboardAccessService = require('../services/dashboardAccessService');
const dashboardVisibility = require('../services/dashboardVisibility');
const dashboardKPIs = require('../services/dashboardKPIs');
const userContext = require('../services/userContext');
const hierarchicalFilter = require('../services/hierarchicalFilter');
const dashboardComposerService = require('../services/dashboardComposerService');
const personalizedInsightsService = require('../services/personalizedInsightsService');
const smartPanelCommandService = require('../services/smartPanelCommandService');
const claudePanelService = require('../services/claudePanelService');
const { userRateLimit } = require('../middleware/userRateLimit');

router.use('/maintenance', dashboardMaintenanceRouter);

const preferencesSchema = z.object({
  cards_order: z.array(z.string()).optional(),
  favorite_kpis: z.array(z.string()).optional(),
  default_period: z.string().optional(),
  favorite_period: z.string().optional(),
  compact_mode: z.boolean().optional(),
  favorite_sector: z.string().optional()
}).passthrough();

const favoriteKpisSchema = z.object({
  favorite_kpis: z.array(z.string()).min(0)
});

const trackSchema = z.object({
  event_type: z.string().min(1).max(64),
  entity_type: z.string().max(64).optional(),
  entity_id: z.string().max(128).optional(),
  context: z.record(z.string(), z.any()).optional()
});

const profileContextSelfSchema = z.object({
  ai_profile_context: z.object({
    focus: z.array(z.string()).optional(),
    language_style: z.string().optional()
  }).optional(),
  preferred_kpis: z.array(z.string()).optional(),
  dashboard_preferences: z.object({
    favorite_period: z.string().optional(),
    favorite_sector: z.string().optional(),
    compact_mode: z.boolean().optional(),
    cards_order: z.array(z.string()).optional()
  }).optional(),
  seniority_level: z.enum(['estrategico', 'tatico', 'operacional']).optional(),
  onboarding_completed: z.boolean().optional()
});

/**
 * GET /dashboard/me
 * Payload completo: perfil + KPIs ordenados por preferências/uso + bloco personalization
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const config = dashboardProfileResolver.getDashboardConfigForUser(user);
    const profileConfig = config.profile_config || {};
    const allowedModules = dashboardAccessService.getAllowedModules(user);
    const hierarchyLevel = user.hierarchy_level ?? userContext.buildUserContext(user)?.hierarchy_level ?? 5;
    const scope = await hierarchicalFilter.resolveHierarchyScope(user);

    const [sections, kpisRaw, personalization] = await Promise.all([
      dashboardVisibility.getVisibilityForUser(hierarchyLevel, user.company_id),
      dashboardKPIs.getDashboardKPIs(user, scope).catch(() => []),
      dashboardComposerService.buildDashboardPayload(user).catch(() => null)
    ]);

    const kpis = dashboardComposerService.applyPersonalizationToKpis(kpisRaw, user);

    res.json({
      profile_code: config.profile_code,
      profile_label: profileConfig.label || config.profile_code,
      profile_config: profileConfig,
      visible_modules: allowedModules.length ? allowedModules : (profileConfig.visible_modules || []),
      user_context: userContext.buildUserContext(user),
      sections,
      kpis,
      functional_area: config.functional_area,
      personalization: personalization || undefined,
      ia_data_depth: dashboardAccessService.getIADataDepth(user),
      effective_permissions: dashboardAccessService.getEffectivePermissions(user)
    });
  } catch (err) {
    console.error('[DASHBOARD_ME]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao carregar perfil' });
  }
});

/**
 * GET /dashboard/config
 * Config consolidada (perfil resolvido + preferências + módulos + instruções IA)
 */
router.get('/config', requireAuth, async (req, res) => {
  try {
    const payload = await dashboardComposerService.buildDashboardPayload(req.user);
    const config = dashboardProfileResolver.getDashboardConfigForUser(req.user);
    res.json({
      ok: true,
      ...payload,
      profile_config: config.profile_config
    });
  } catch (err) {
    console.error('[DASHBOARD_CONFIG]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao carregar config' });
  }
});

/**
 * POST /dashboard/preferences
 * Merge em dashboard_preferences (JSONB)
 */
router.post('/preferences', requireAuth, express.json({ limit: '32kb' }), async (req, res) => {
  try {
    const parsed = preferencesSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'Dados inválidos' });
    }
    const p = parsed.data;
    const patch = {};
    if (p.cards_order) patch.cards_order = p.cards_order;
    if (p.default_period || p.favorite_period) patch.favorite_period = p.favorite_period || p.default_period;
    if (typeof p.compact_mode === 'boolean') patch.compact_mode = p.compact_mode;
    if (p.favorite_sector) patch.favorite_sector = p.favorite_sector;

    await dashboardComposerService.mergeDashboardPreferences(req.user.id, patch);
    if (p.favorite_kpis && Array.isArray(p.favorite_kpis)) {
      await db.query(
        'UPDATE users SET preferred_kpis = $1::jsonb, updated_at = now() WHERE id = $2',
        [JSON.stringify(p.favorite_kpis), req.user.id]
      );
    }
    await dashboardPersonalizadoService.invalidarCache(req.user.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[DASHBOARD_PREFERENCES]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao salvar' });
  }
});

/**
 * POST /dashboard/favorite-kpis
 */
router.post('/favorite-kpis', requireAuth, express.json({ limit: '32kb' }), async (req, res) => {
  try {
    const parsed = favoriteKpisSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'favorite_kpis inválido' });
    }
    await db.query(
      'UPDATE users SET preferred_kpis = $1::jsonb, updated_at = now() WHERE id = $2',
      [JSON.stringify(parsed.data.favorite_kpis), req.user.id]
    );
    await dashboardPersonalizadoService.invalidarCache(req.user.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[DASHBOARD_FAVORITE_KPIS]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao salvar' });
  }
});

/**
 * POST /dashboard/track-interaction
 * Eventos para ordenação/priorização (não substitui auditoria)
 */
router.post('/track-interaction', requireAuth, express.json({ limit: '32kb' }), async (req, res) => {
  try {
    const parsed = trackSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'Payload inválido' });
    }
    const { event_type, entity_type, entity_id, context } = parsed.data;
    await dashboardComposerService.recordInteraction(
      req.user.id,
      req.user.company_id,
      event_type,
      entity_type,
      entity_id,
      context || {}
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[DASHBOARD_TRACK]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao registar' });
  }
});

/**
 * GET /dashboard/insights
 * Insights adaptados ao perfil (a partir dos KPIs dinâmicos como base)
 */
router.get('/insights', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 8));
    const scope = await hierarchicalFilter.resolveHierarchyScope(user);
    const kpis = await dashboardKPIs.getDashboardKPIs(user, scope).catch(() => []);
    const raw = kpis.slice(0, limit).map((k, i) => ({
      id: `ins-${k.key || k.id || i}`,
      title: k.title || 'Indicador',
      summary: personalizedInsightsService.buildInsightSummaryForKpi(k, user),
      severity: personalizedInsightsService.severityFromKpi(k)
    }));
    const insights = personalizedInsightsService.adaptInsightsToProfile(user, raw);
    res.json({ ok: true, insights, insights_instructions: personalizedInsightsService.getInsightsInstructions(
      dashboardProfileResolver.resolveDashboardProfile(user),
      user
    ) });
  } catch (err) {
    console.error('[DASHBOARD_INSIGHTS]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro' });
  }
});

/**
 * GET /dashboard/widgets
 * Lista de widgets do perfil base (filtrado por permissão de cards sensíveis quando aplicável)
 */
router.get('/widgets', requireAuth, async (req, res) => {
  try {
    const config = dashboardProfileResolver.getDashboardConfigForUser(req.user);
    const widgets = config.profile_config?.widgets || [];
    res.json({ ok: true, widgets });
  } catch (err) {
    console.error('[DASHBOARD_WIDGETS]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro' });
  }
});

/**
 * PATCH /dashboard/profile-context
 * Atualização pelo próprio utilizador (mesmos campos que admin, escopo = self)
 */
router.patch('/profile-context', requireAuth, express.json({ limit: '64kb' }), async (req, res) => {
  try {
    const parsed = profileContextSelfSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: parsed.error.errors?.[0]?.message || 'Dados inválidos' });
    }
    const data = parsed.data;
    const updates = [];
    const params = [];
    let p = 1;
    if (data.ai_profile_context) {
      params.push(JSON.stringify(data.ai_profile_context));
      updates.push(`ai_profile_context = $${p++}`);
    }
    if (data.preferred_kpis) {
      params.push(JSON.stringify(data.preferred_kpis));
      updates.push(`preferred_kpis = $${p++}`);
    }
    if (data.dashboard_preferences) {
      params.push(JSON.stringify(data.dashboard_preferences));
      updates.push(`dashboard_preferences = COALESCE(dashboard_preferences, '{}')::jsonb || $${p++}::jsonb`);
    }
    if (data.seniority_level) {
      params.push(data.seniority_level);
      updates.push(`seniority_level = $${p++}`);
    }
    if (typeof data.onboarding_completed === 'boolean') {
      params.push(data.onboarding_completed);
      updates.push(`onboarding_completed = $${p++}`);
    }
    if (updates.length === 0) {
      return res.status(400).json({ ok: false, error: 'Nenhum campo para atualizar' });
    }
    params.push(req.user.id);
    const r = await db.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = now()
       WHERE id = $${p} AND deleted_at IS NULL
       RETURNING id, ai_profile_context, preferred_kpis, dashboard_preferences, seniority_level, onboarding_completed`,
      params
    );
    if (!r.rows?.length) return res.status(404).json({ ok: false, error: 'Utilizador não encontrado' });
    await dashboardPersonalizadoService.invalidarCache(req.user.id);
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[DASHBOARD_PROFILE_CONTEXT]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao atualizar' });
  }
});

/**
 * GET /dashboard/summary
 */
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const summary = await dashboardKPIs.getDashboardSummary(req.user);
    res.json({ summary });
        } catch (err) {
    console.error('[DASHBOARD_SUMMARY]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao carregar resumo' });
  }
});

/**
 * GET /dashboard/kpis
 */
router.get('/kpis', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const scope = await hierarchicalFilter.resolveHierarchyScope(user);
    const kpisRaw = await dashboardKPIs.getDashboardKPIs(user, scope);
    const kpis = dashboardComposerService.applyPersonalizationToKpis(kpisRaw, user);
    res.json({ kpis });
  } catch (err) {
    console.error('[DASHBOARD_KPIS_ROUTE]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao carregar KPIs' });
  }
});

/**
 * GET /dashboard/personalizado
 * Resposta inclui: ok, perfil, modulos, assistente_ia, layout, layout_rules_version (número da versão das regras de grid; debugging/telemetria).
 */
router.get('/personalizado', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const cfg = await dashboardPersonalizadoService.getConfigPersonalizado(user);
    if (!cfg) return res.status(404).json({ ok: false, error: 'Config não disponível' });
    res.json({ ok: true, ...cfg });
  } catch (err) {
    console.error('[DASHBOARD_PERSONALIZADO]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /dashboard/invalidar-cache
 */
router.post('/invalidar-cache', requireAuth, async (req, res) => {
  try {
    await dashboardPersonalizadoService.invalidarCache(req.user.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[DASHBOARD_INVALIDAR]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /dashboard/panel-command
 * Painel de comando visual: interpretação (IA) + dados reais hidratados no servidor.
 */
router.post('/panel-command', requireAuth, userRateLimit('executive_query'), async (req, res) => {
  try {
    const cmd = String(req.body?.command ?? '').trim();
    if (!cmd || cmd.length > 4000) {
      return res.status(400).json({ ok: false, error: 'Comando vazio ou demasiado longo.' });
    }
    const output = await smartPanelCommandService.processPanelCommand(req.user, cmd);
    res.json({ ok: true, output });
  } catch (err) {
    console.error('[PANEL_COMMAND]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao processar o painel.' });
  }
});

/**
 * POST /dashboard/claude-panel
 * Painel visual pós-conversa (Claude): JSON com gráfico, tabela, KPI, relatório ou alertas.
 * A voz continua na OpenAI; esta rota só alimenta o painel direito.
 */
router.post('/claude-panel', requireAuth, userRateLimit('executive_query'), async (req, res) => {
  try {
    const userTranscript = String(req.body?.userTranscript ?? '').trim();
    const assistantResponse = String(req.body?.assistantResponse ?? '').trim();
    if (userTranscript.length > 8000 || assistantResponse.length > 8000) {
      return res.status(400).json({ ok: false, error: 'Texto demasiado longo.' });
    }
    const result = await claudePanelService.generateVisualPanel(req.user, {
      userTranscript,
      assistantResponse
    });
    res.json(result);
  } catch (err) {
    console.error('[CLAUDE_PANEL]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro no painel Claude.', shouldRender: false });
  }
});

module.exports = router;
