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
let personalizedInsightsService = null;
try {
  personalizedInsightsService = require('../services/personalizedInsightsService');
} catch (e) {
  console.warn('[INSIGHTS_SERVICE_MISSING]', e && e.message ? String(e.message) : e);
}
const smartPanelCommandService = require('../services/smartPanelCommandService');
const claudePanelService = require('../services/claudePanelService');
const voiceRealtimeContextService = require('../services/voiceRealtimeContextService');
const { composeLiveDashboardSurface } = require('../services/dashboardComposer');
const { userRateLimit } = require('../middleware/userRateLimit');
const ai = require('../services/ai');
const { synthesize, parseFinalStructuredResponse } = require('../ai/responseSynthesizer');
const dataLineageService = require('../services/dataLineageService');
const secureContextBuilder = require('../services/secureContextBuilder');
const strategicLearningService = require('../services/strategicLearningService');
const { getUnifiedSessionContext } = require('../services/unifiedSessionContextService');
const smartSummaryService = require('../services/smartSummary');
const { heavyRouteLimiter } = require('../middleware/globalRateLimit');
const dashboardOperationalBrainRouter = require('./dashboardOperationalBrain');

function userHasDirectorOrAdminInsightsAccess(u) {
  const role = String((u && u.role) || '').toLowerCase();
  if (['admin', 'ceo', 'diretor', 'director'].includes(role) || role.includes('diretor')) return true;
  try {
    const contextualSystemAdmin = require('../services/contextualSystemAdminService');
    return contextualSystemAdmin.userHasSystemAdministrationCapability(u || {});
  } catch {
    return false;
  }
}

// Dashboard Engine V2 (aditivo, controlado por feature flag).
// Em `IMPETUS_DASHBOARD_ENGINE_V2=off` (default) este import existe mas
// nenhum efeito é produzido — o comportamento da rota mantém-se idêntico ao
// histórico. Em `shadow`/`on`, o gateway corre e adiciona campos `engine_v2`
// ao payload de `/dashboard/me` sem remover ou renomear campos existentes.
let _dashboardCompositionGateway = null;
let _dashboardDecisionTrace = null;
let _dashboardUsageTelemetry = null;
let _divergenceIntelligence = null;
let _feedbackLoop = null;
let _contextIdentityAudit = null;
try {
  _dashboardCompositionGateway = require('../dashboardEngineV2/gateway/dashboardCompositionGateway');
} catch (e) {
  console.warn('[DASHBOARD_ENGINE_V2_LOAD_FAIL]', e && e.message ? e.message : e);
}
try {
  _dashboardDecisionTrace = require('../dashboardEngineV2/observability/dashboardDecisionTrace');
  _dashboardUsageTelemetry = require('../dashboardEngineV2/observability/dashboardUsageTelemetry');
  _divergenceIntelligence = require('../dashboardEngineV2/observability/divergenceIntelligence');
  _feedbackLoop = require('../dashboardEngineV2/learning/feedbackLoop');
  _contextIdentityAudit = require('../dashboardEngineV2/audit/contextIdentityAudit');
} catch (e) {
  console.warn('[DASHBOARD_ENGINE_V2_OBS_LOAD_FAIL]', e && e.message ? e.message : e);
}

// Phase 4 — Governance Layer (aditivo, opt-in via feature flag).
let _governance = null;
try {
  _governance = require('../dashboardEngineV2/governance/governanceFacade');
} catch (e) {
  console.warn('[DASHBOARD_GOVERNANCE_LOAD_FAIL]', e && e.message ? e.message : e);
}

// Phase 6 — Contextual Module Layer (aditivo, controlado por flags
// IMPETUS_CONTEXTUAL_MODULES*; default 'off' preserva contrato byte-a-byte).
let _contextualModules = null;
try {
  _contextualModules = require('../contextualModules');
} catch (e) {
  console.warn('[CONTEXTUAL_MODULES_LOAD_FAIL]', e && e.message ? e.message : e);
}

const _GOVERNANCE_ENABLED = String(process.env.IMPETUS_GOVERNANCE_ENABLED || 'true').toLowerCase() !== 'false';

function _isAdminOrAuditor(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase().trim();
  if (role === 'admin' || role === 'ceo') return true;
  if (Array.isArray(user.permissions) && (user.permissions.includes('*') || user.permissions.includes('VIEW_AUDIT_LOGS'))) return true;
  if (user.dashboard_profile === 'audit_governance' || user.dashboard_profile === 'admin') return true;
  return false;
}

/**
 * Proposta informativa ao utilizador com base em meta.system_influence (sem execução automática).
 * @param {object|null} systemInfluence
 * @returns {{ type: string, message: string, severity: string } | null}
 */
function buildSystemInfluenceMessage(systemInfluence) {
  if (!systemInfluence || typeof systemInfluence !== 'object') return null;

  const {
    priority_override,
    requires_attention,
    risk_level,
    confidence_score: _confidence_score
  } = systemInfluence;

  const rl = risk_level != null ? String(risk_level).toLowerCase() : '';

  if (priority_override === true && rl === 'high') {
    return {
      type: 'critical_action_proposal',
      message:
        'Identifiquei uma situação crítica que pode impactar a operação. Posso registrar uma ação para tratamento imediato. Deseja que eu prossiga?',
      severity: 'high'
    };
  }

  if (requires_attention === true) {
    return {
      type: 'attention_action_proposal',
      message:
        'Esse cenário merece atenção. Posso gerar uma recomendação estruturada ou registrar uma ação preventiva. Deseja que eu prossiga?',
      severity: 'medium'
    };
  }

  return null;
}

/**
 * Evita expor erros internos de runtime no chat para o utilizador final.
 * @param {unknown} err
 * @param {string} fallback
 */
function buildSafeChatErrorMessage(err, fallback) {
  const raw = err && err.message ? String(err.message) : '';
  const normalized = raw.toLowerCase();
  const internalRuntimeError =
    normalized.includes('before initialization') ||
    normalized.includes('referenceerror') ||
    normalized.includes('syntaxerror') ||
    normalized.includes('typeerror');
  if (internalRuntimeError) return fallback;
  if (!raw.trim()) return fallback;
  return raw.slice(0, 300);
}

router.use('/maintenance', dashboardMaintenanceRouter);
router.use('/operational-brain', dashboardOperationalBrainRouter);

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
/**
 * GET /dashboard/voice-realtime-context
 * Texto para anexar ao system prompt da sessão OpenAI Realtime (dados internos + regras de acesso).
 */
router.get('/voice-realtime-context', requireAuth, async (req, res) => {
  try {
    const payload = await voiceRealtimeContextService.buildVoiceRealtimeContext(req.user);
    res.json(payload);
  } catch (err) {
    console.error('[VOICE_REALTIME_CONTEXT]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao montar contexto de voz' });
  }
});

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
      dashboardKPIs.getDashboardKPIs(user, scope).catch((err) => {
        console.warn('[routes/dashboard][me_kpis]', err?.message ?? err);
        return [];
      }),
      dashboardComposerService.buildDashboardPayload(user).catch((err) => {
        console.warn('[routes/dashboard][me_personalization]', err?.message ?? err);
        return null;
      })
    ]);

    const kpis = dashboardComposerService.applyPersonalizationToKpis(kpisRaw, user);

    // Resposta legacy (Motor A) — preservada byte-a-byte.
    const _legacyVisibleModules = allowedModules.length ? allowedModules : (profileConfig.visible_modules || []);
    const legacyResponse = {
      profile_code: config.profile_code,
      profile_label: profileConfig.label || config.profile_code,
      profile_config: profileConfig,
      visible_modules: _legacyVisibleModules,
      contextual_capabilities: Array.isArray(user.contextual_capabilities) ? user.contextual_capabilities : [],
      user_context: userContext.buildUserContext(user),
      sections,
      kpis,
      functional_area: config.functional_area,
      functional_axis: config.functional_axis || config.functional_area,
      functional_area_label: config.functional_area_label,
      functional_area_source: config.functional_area_source,
      contextual_modules_hint: config.contextual_modules_hint,
      personalization: personalization || undefined,
      ia_data_depth: dashboardAccessService.getIADataDepth(user),
      effective_permissions: dashboardAccessService.getEffectivePermissions(user),
      is_tenant_admin: !!user.is_tenant_admin,
      tenant_admin_type: user.tenant_admin_type || null,
      tenant_admin_can_manage: !!user.tenant_admin_can_manage
    };

    // Phase 6 — Contextual Module Orchestration (invisível por defeito).
    // Em `IMPETUS_CONTEXTUAL_MODULES=off` (default), `visible_modules` permanece
    // exactamente igual ao legacy e `contextual_modules` é omitido. Em
    // `enrich`/`replace`, o array `visible_modules` é actualizado para um
    // superset coerente do vocabulário canónico (frontend não é alterado).
    let _contextualModulesBlock = null;
    let _contextualModulesMeta = null;
    try {
      if (_contextualModules) {
        const out = _contextualModules.enhanceVisibleModulesWithContext(_legacyVisibleModules, user);
        if (out && Array.isArray(out.visibleModules)) {
          legacyResponse.visible_modules = out.visibleModules;
        }
        if (out && Array.isArray(out.contextualModules) && out.contextualModules.length > 0) {
          _contextualModulesBlock = out.contextualModules;
        }
        _contextualModulesMeta = out && out.meta ? out.meta : null;
      }
    } catch (cmErr) {
      // Falhas silenciosas — preserva comportamento legacy
      console.warn('[CONTEXTUAL_MODULES_INVOKE_FAIL]', cmErr && cmErr.message ? cmErr.message : cmErr);
    }

    // Engine V2 (aditivo). Em `off` (default), `engine_v2` é null.
    // Em `shadow`, V2 corre em paralelo e expõe metadata + diff.
    // Em `on`, a saída V2 é a fonte primária do `engine_v2.payload`,
    // mas a resposta legacy continua íntegra para retrocompatibilidade.
    let engineV2Block = null;
    try {
      if (
        _dashboardCompositionGateway &&
        process.env.IMPETUS_DASHBOARD_ENGINE_V2 &&
        process.env.IMPETUS_DASHBOARD_ENGINE_V2 !== 'off'
      ) {
        const v2 = await _dashboardCompositionGateway.composePrimary(user);
        if (v2 && v2.payload) {
          engineV2Block = {
            engine: v2.meta?.engine || 'A',
            trace_id: v2.meta?.trace_id || null,
            latency_ms: v2.meta?.latency_ms ?? null,
            diff_summary: v2.meta?.diff_summary || null,
            // Vista V2 — campos aditivos. O frontend antigo continua a
            // ler `kpis`, `visible_modules`, `personalization` da resposta
            // legacy. O frontend novo pode optar por consumir
            // `engine_v2.payload.layout.widgets` quando preferir.
            payload: {
              identity: v2.payload.identity,
              perfil: v2.payload.perfil,
              modulos: v2.payload.modulos,
              layout: v2.payload.layout,
              assistente_ia: v2.payload.assistente_ia,
              personalization: v2.payload.personalization,
              explainability: v2.payload.explainability
            }
          };
        }
      }
    } catch (v2err) {
      // Falhas do V2 são silenciosas para preservar o comportamento legacy.
      console.warn('[DASHBOARD_ENGINE_V2_INVOKE_FAIL]',
        v2err && v2err.message ? v2err.message : v2err);
    }

    res.json({
      ...legacyResponse,
      // Aditivo: presente apenas quando o V2 está activo.
      ...(engineV2Block ? { engine_v2: engineV2Block } : {}),
      // Phase 6 — chaves aditivas. Frontend actual ignora silenciosamente.
      ...(_contextualModulesBlock ? { contextual_modules: _contextualModulesBlock } : {}),
      ...(_contextualModulesMeta && _contextualModulesMeta.mode && _contextualModulesMeta.mode !== 'off'
        ? { contextual_modules_meta: {
            mode: _contextualModulesMeta.mode,
            fallback: _contextualModulesMeta.fallback === true,
            validator_valid: _contextualModulesMeta.validator ? _contextualModulesMeta.validator.valid : null,
            trust_score: _contextualModulesMeta.validator ? _contextualModulesMeta.validator.trust_score : null,
            diff: _contextualModulesMeta.diff || null
          } }
        : {})
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

// ────────────────────────────────────────────────────────────────────────────
// Phase 3 — Observability, Telemetry & Feedback (Engine V2)
// Rotas aditivas: nenhuma rota existente foi alterada. Falham silenciosamente
// se os módulos V2 não estiverem carregados.
// ────────────────────────────────────────────────────────────────────────────

/**
 * POST /dashboard/v2/usage
 * Captura evento de uso de widget (view/click/open/close/dwell/shortcut).
 * Body: { kind, widget_id, trace_id?, axis?, dwell_ms?, context? }
 */
const usageSchema = z.object({
  kind: z.enum(['view', 'click', 'open', 'close', 'dwell', 'shortcut']),
  widget_id: z.string().min(1).max(120),
  trace_id: z.string().max(64).optional(),
  axis: z.string().max(80).optional(),
  dwell_ms: z.number().int().nonnegative().optional(),
  context: z.string().max(200).optional()
});
router.post('/v2/usage', requireAuth, express.json({ limit: '8kb' }), async (req, res) => {
  try {
    if (!_dashboardUsageTelemetry) return res.status(503).json({ ok: false, error: 'telemetry_disabled' });
    const parsed = usageSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ ok: false, error: 'invalid_payload' });
    const u = req.user || {};
    const event = _dashboardUsageTelemetry.record({
      ...parsed.data,
      user_id: u.id || null,
      company_id: u.company_id || null,
      area: u.functional_area || u.area || null,
      function_type: u.function_type || null
    });
    return res.json({ ok: true, event });
  } catch (err) {
    console.error('[V2_USAGE_RECORD]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'erro' });
  }
});

/**
 * GET /dashboard/v2/decision-trace
 * Lista os últimos N decision-traces. Restrita a admins/diretores.
 */
router.get('/v2/decision-trace', requireAuth, async (req, res) => {
  try {
    if (!_dashboardDecisionTrace) return res.status(503).json({ ok: false, error: 'trace_disabled' });
    const u = req.user || {};
    if (!userHasDirectorOrAdminInsightsAccess(u)) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const traceId = req.query.trace_id ? String(req.query.trace_id) : null;
    const area = req.query.area ? String(req.query.area) : null;
    const fn = req.query.function_type ? String(req.query.function_type) : null;
    const traces = _dashboardDecisionTrace.getRecent({ limit, traceId, area, functionType: fn });
    return res.json({ ok: true, count: traces.length, stats: { by_engine: _dashboardDecisionTrace.statsByEngine(), by_area: _dashboardDecisionTrace.statsByArea() }, traces });
  } catch (err) {
    console.error('[V2_DECISION_TRACE]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'erro' });
  }
});

/**
 * GET /dashboard/v2/divergence
 * Snapshot de Divergence Intelligence (cruza decision-trace × usage).
 */
router.get('/v2/divergence', requireAuth, async (req, res) => {
  try {
    if (!_divergenceIntelligence) return res.status(503).json({ ok: false, error: 'divergence_disabled' });
    const u = req.user || {};
    if (!userHasDirectorOrAdminInsightsAccess(u)) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }
    const fn = req.query.function_type ? String(req.query.function_type) : null;
    const snap = _divergenceIntelligence.snapshot({ functionType: fn });
    return res.json({ ok: true, ...snap });
  } catch (err) {
    console.error('[V2_DIVERGENCE]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'erro' });
  }
});

/**
 * POST /dashboard/v2/feedback
 * Captura feedback explícito do utilizador sobre relevância de widget.
 * Body: { trace_id?, widget_id, kind, reason_text? }
 */
const feedbackSchema = z.object({
  trace_id: z.string().max(64).optional(),
  widget_id: z.string().min(1).max(120),
  kind: z.enum(['helpful', 'not_helpful', 'irrelevant', 'wanted_but_missing']),
  reason_text: z.string().max(500).optional()
});
router.post('/v2/feedback', requireAuth, express.json({ limit: '8kb' }), async (req, res) => {
  try {
    if (!_feedbackLoop) return res.status(503).json({ ok: false, error: 'feedback_disabled' });
    const parsed = feedbackSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ ok: false, error: 'invalid_payload' });
    const u = req.user || {};
    const entry = _feedbackLoop.record({
      ...parsed.data,
      user_id: u.id || null,
      company_id: u.company_id || null
    });
    return res.json({ ok: !!entry, entry });
  } catch (err) {
    console.error('[V2_FEEDBACK]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'erro' });
  }
});

/**
 * GET /dashboard/v2/identity-audit
 * Executa CONTEXT_IDENTITY_AUDIT no escopo da empresa do utilizador.
 * Restrita a admins/diretores.
 */
router.get('/v2/identity-audit', requireAuth, async (req, res) => {
  try {
    if (!_contextIdentityAudit) return res.status(503).json({ ok: false, error: 'audit_disabled' });
    const u = req.user || {};
    const role = String(u.role || '').toLowerCase();
    let okAudit = ['admin', 'ceo'].includes(role);
    if (!okAudit) {
      try {
        const contextualSystemAdmin = require('../services/contextualSystemAdminService');
        okAudit = contextualSystemAdmin.userHasSystemAdministrationCapability(u);
      } catch {
        okAudit = false;
      }
    }
    if (!okAudit) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }
    const limit = Math.min(2000, Math.max(1, Number(req.query.limit) || 500));
    const report = await _contextIdentityAudit.auditFromDatabase(db, {
      limit,
      company_id: u.company_id
    });
    return res.json({ ok: true, ...report });
  } catch (err) {
    console.error('[V2_IDENTITY_AUDIT]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'erro' });
  }
});

// ── GOVERNANCE LAYER (Phase 4) ───────────────────────────────────────────
// Todas as rotas exigem admin/auditor e respeitam IMPETUS_GOVERNANCE_ENABLED.

function _governanceGuard(req, res, next) {
  if (!_governance) return res.status(503).json({ ok: false, error: 'governance_unavailable' });
  if (!_GOVERNANCE_ENABLED) return res.status(503).json({ ok: false, error: 'governance_disabled' });
  if (!_isAdminOrAuditor(req.user)) return res.status(403).json({ ok: false, error: 'forbidden' });
  return next();
}

/**
 * GET /dashboard/v2/governance/snapshot
 * Snapshot global da governança (integrity + risks + recommendations + capabilities + history).
 */
router.get('/v2/governance/snapshot', requireAuth, _governanceGuard, async (req, res) => {
  try {
    const u = req.user || {};
    const limit = Math.min(2000, Math.max(1, Number(req.query.limit) || 500));
    const includeUsersBreakdown = String(req.query.users || 'false').toLowerCase() === 'true';
    const snap = await _governance.snapshotFromDatabase(db, {
      company_id: u.company_id,
      limit,
      includeUsersBreakdown
    });
    return res.json({ ok: true, ...snap });
  } catch (err) {
    console.error('[V2_GOVERNANCE_SNAPSHOT]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'erro' });
  }
});

/**
 * GET /dashboard/v2/governance/integrity
 * Score organizacional (sem detalhes por user, salvo `?users=true`).
 */
router.get('/v2/governance/integrity', requireAuth, _governanceGuard, async (req, res) => {
  try {
    const u = req.user || {};
    const limit = Math.min(2000, Math.max(1, Number(req.query.limit) || 500));
    const includeUsers = String(req.query.users || 'false').toLowerCase() === 'true';
    const out = await _governance.score.scoreFromDatabase(db, { company_id: u.company_id, limit });
    if (!includeUsers) delete out.by_user;
    return res.json({ ok: true, ...out });
  } catch (err) {
    console.error('[V2_GOVERNANCE_INTEGRITY]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'erro' });
  }
});

/**
 * GET /dashboard/v2/governance/risks
 * Riscos contextuais detectados.
 */
router.get('/v2/governance/risks', requireAuth, _governanceGuard, async (req, res) => {
  try {
    const u = req.user || {};
    const limit = Math.min(2000, Math.max(1, Number(req.query.limit) || 500));
    const out = await _governance.risks.detectRisksFromDatabase(db, { company_id: u.company_id, limit });
    return res.json({ ok: true, ...out });
  } catch (err) {
    console.error('[V2_GOVERNANCE_RISKS]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'erro' });
  }
});

/**
 * GET /dashboard/v2/governance/recommendations
 * Recomendações contextuais (não-automáticas, auditáveis).
 */
router.get('/v2/governance/recommendations', requireAuth, _governanceGuard, async (req, res) => {
  try {
    const u = req.user || {};
    const limit = Math.min(2000, Math.max(1, Number(req.query.limit) || 500));
    const out = await _governance.recos.recommendFromDatabase(db, { company_id: u.company_id, limit });
    return res.json({ ok: true, ...out });
  } catch (err) {
    console.error('[V2_GOVERNANCE_RECOMMENDATIONS]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'erro' });
  }
});

/**
 * GET /dashboard/v2/governance/capabilities
 * Análise de consistência de capabilities + matriz cap×função×área.
 */
router.get('/v2/governance/capabilities', requireAuth, _governanceGuard, async (req, res) => {
  try {
    const u = req.user || {};
    const limit = Math.min(2000, Math.max(1, Number(req.query.limit) || 500));
    const out = await _governance.caps.analyzeFromDatabase(db, { company_id: u.company_id, limit });
    return res.json({ ok: true, ...out });
  } catch (err) {
    console.error('[V2_GOVERNANCE_CAPABILITIES]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'erro' });
  }
});

/**
 * GET /dashboard/v2/governance/history
 * Histórico contextual recente (eventos do buffer).
 */
router.get('/v2/governance/history', requireAuth, _governanceGuard, async (req, res) => {
  try {
    const u = req.user || {};
    const scope = req.query.scope || (u.company_id ? `company:${u.company_id}` : 'global');
    const kind = req.query.kind || null;
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
    const filter = { scope, kind, since: req.query.since, until: req.query.until };
    const events = _governance.history.getRecent(filter, limit);
    const tl = _governance.history.timeline(scope, kind, Number(req.query.days) || 30);
    return res.json({
      ok: true,
      scope,
      kind,
      events_count: events.length,
      events,
      timeline: tl,
      total_in_buffer: _governance.history.size()
    });
  } catch (err) {
    console.error('[V2_GOVERNANCE_HISTORY]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'erro' });
  }
});

/**
 * GET /dashboard/v2/governance/score/:userId
 * Score detalhado de um utilizador específico (mesma empresa).
 */
router.get('/v2/governance/score/:userId', requireAuth, _governanceGuard, async (req, res) => {
  try {
    const u = req.user || {};
    const targetId = req.params.userId;
    const r = await db.query(
      `SELECT id, company_id, role, job_title, functional_area, department,
              hierarchy_level, permissions, dashboard_profile
       FROM users WHERE id = $1 AND ($2::uuid IS NULL OR company_id = $2)
       LIMIT 1`,
      [targetId, u.company_id || null]
    );
    const target = r?.rows?.[0];
    if (!target) return res.status(404).json({ ok: false, error: 'user_not_found' });
    const score = _governance.score.scoreUser(target);
    const risks = _governance.risks.detectRisksForUser(target);
    const recos = _governance.recos.recommendForUser(target);
    return res.json({ ok: true, score, risks, recommendations: recos });
  } catch (err) {
    console.error('[V2_GOVERNANCE_SCORE_USER]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'erro' });
  }
});

/* ─────────────────────────────────────────────────────────────────────
 * Phase 6 — Contextual Modules administrative endpoints.
 * Inspeção e controlo do orquestrador funcional.
 * Acesso restrito a admin/auditor.
 * ───────────────────────────────────────────────────────────────────── */
function _contextualModulesGuard(req, res, next) {
  if (!_contextualModules) return res.status(503).json({ ok: false, error: 'contextual_modules_disabled' });
  if (!_isAdminOrAuditor(req.user)) return res.status(403).json({ ok: false, error: 'forbidden' });
  return next();
}

router.get('/v2/modules/state', requireAuth, _contextualModulesGuard, async (req, res) => {
  try {
    const flags = _contextualModules.flags.getFlags();
    const circuit = _contextualModules.guard.getCircuitState();
    return res.json({
      ok: true,
      flags,
      manual_fallback: _contextualModules.guard.isManualFallback(),
      circuit
    });
  } catch (err) {
    console.error('[V2_MODULES_STATE]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'erro' });
  }
});

router.get('/v2/modules/registry', requireAuth, _contextualModulesGuard, async (req, res) => {
  try {
    const all = _contextualModules.registry.getAllModules();
    return res.json({ ok: true, count: all.length, registry: all });
  } catch (err) {
    console.error('[V2_MODULES_REGISTRY]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'erro' });
  }
});

router.get('/v2/modules/telemetry', requireAuth, _contextualModulesGuard, async (req, res) => {
  try {
    const since = req.query.since ? Number(req.query.since) : 0;
    const summary = _contextualModules.getTelemetrySummary({ since });
    const recentRes = _contextualModules.telemetry.getResolutionsRecent(50);
    const recentUsage = _contextualModules.telemetry.getUsageRecent(50);
    return res.json({ ok: true, summary, recent_resolutions: recentRes, recent_usage: recentUsage });
  } catch (err) {
    console.error('[V2_MODULES_TELEMETRY]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'erro' });
  }
});

router.post('/v2/modules/usage', requireAuth, express.json({ limit: '8kb' }), async (req, res) => {
  try {
    if (!_contextualModules) return res.status(503).json({ ok: false, error: 'contextual_modules_disabled' });
    const moduleId = req.body && req.body.module_id ? String(req.body.module_id) : null;
    if (!moduleId) return res.status(400).json({ ok: false, error: 'invalid_payload' });
    const action = req.body.action ? String(req.body.action) : 'view';
    const duration = Number.isFinite(req.body.duration_ms) ? Number(req.body.duration_ms) : null;
    _contextualModules.recordUsage({
      module_id: moduleId,
      action,
      duration_ms: duration,
      user_id: req.user?.id ?? null
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[V2_MODULES_USAGE]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'erro' });
  }
});

router.post('/v2/modules/fallback', requireAuth, _contextualModulesGuard, async (req, res) => {
  try {
    const active = req.body && req.body.active === true;
    _contextualModules.guard.manualForceFallback(active);
    return res.json({ ok: true, manual_fallback: active === true });
  } catch (err) {
    console.error('[V2_MODULES_FALLBACK]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'erro' });
  }
});

router.post('/v2/modules/clear-fallback', requireAuth, _contextualModulesGuard, async (req, res) => {
  try {
    _contextualModules.guard.manualForceFallback(false);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[V2_MODULES_CLEAR_FALLBACK]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'erro' });
  }
});

router.get('/v2/modules/preview/:userId?', requireAuth, _contextualModulesGuard, async (req, res) => {
  try {
    const u = req.user;
    const targetId = req.params.userId || u.id;
    const r = await db.query(
      `SELECT id, company_id, role, job_title, functional_area, department,
              hierarchy_level, permissions, dashboard_profile
       FROM users WHERE id = $1 AND ($2::uuid IS NULL OR company_id = $2)
       LIMIT 1`,
      [targetId, u.company_id || null]
    );
    const target = r?.rows?.[0];
    if (!target) return res.status(404).json({ ok: false, error: 'user_not_found' });
    const legacy = dashboardAccessService.getAllowedModules(target);
    const out = _contextualModules.enhanceVisibleModulesWithContext(legacy, target, { trace: false });
    return res.json({
      ok: true,
      target: { id: target.id, role: target.role, area: target.functional_area, hierarchy_level: target.hierarchy_level },
      legacy,
      contextual: out.visibleModules,
      contextual_modules: out.contextualModules,
      meta: out.meta
    });
  } catch (err) {
    console.error('[V2_MODULES_PREVIEW]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'erro' });
  }
});

/**
 * GET /dashboard/insights
 * Insights adaptados ao perfil (a partir dos KPIs dinâmicos como base)
 */
router.get('/insights', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    if (!personalizedInsightsService) {
      console.warn('[INSIGHTS_SERVICE_MISSING]');
      return res.json({ ok: true, insights: [], insights_instructions: null });
    }
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 8));
    const scope = await hierarchicalFilter.resolveHierarchyScope(user);
    const kpis = await dashboardKPIs.getDashboardKPIs(user, scope).catch((err) => {
      console.warn('[routes/dashboard][insights_kpis]', err?.message ?? err);
      return [];
    });
    const raw = kpis.slice(0, limit).map((k, i) => ({
      id: `ins-${k.key || k.id || i}`,
      title: k.title || 'Indicador',
      summary: personalizedInsightsService.buildInsightSummaryForKpi(k, user),
      severity: personalizedInsightsService.severityFromKpi(k),
      explanation_layer: personalizedInsightsService.buildExplanationLayerForKpi(k, user)
    }));
    const insights = personalizedInsightsService.adaptInsightsToProfile(user, raw);
    const insights_instructions = await personalizedInsightsService.getInsightsInstructions(
      dashboardProfileResolver.resolveDashboardProfile(user),
      user
    );
    res.json({ ok: true, insights, insights_instructions });
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
/**
 * GET /dashboard/smart-summary
 * Resumo inteligente diário/semanal (IA); cabeçalho X-AI-Trace-ID quando gerado com sucesso.
 */
router.get('/smart-summary', requireAuth, heavyRouteLimiter, async (req, res) => {
  try {
    const u = req.user;
    if (!u?.company_id) {
      return res.status(400).json({ ok: false, error: 'Empresa não identificada.' });
    }
    const out = await smartSummaryService.buildSmartSummary(u.id, u.name, u.company_id, u);
    if (out.aiTraceId) res.setHeader('X-AI-Trace-ID', String(out.aiTraceId));
    res.json({ ok: true, ...out });
  } catch (err) {
    console.error('[SMART_SUMMARY_ROUTE]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao gerar resumo inteligente.' });
  }
});

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
 * GET /dashboard/live-surface
 * Superficie dinamica de inteligencia operacional baseada em eventos.
 */
router.get('/live-surface', requireAuth, async (req, res) => {
  try {
    const surface = await composeLiveDashboardSurface(req.user);
    res.json({ ok: true, surface });
  } catch (err) {
    console.error('[DASHBOARD_LIVE_SURFACE]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao montar painel vivo' });
  }
});

/**
 * GET /dashboard/live-surface/stream
 * Stream SSE para atualizacao continua do painel vivo sem refresh.
 */
router.get('/live-surface/stream', requireAuth, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let closed = false;
  const user = req.user;

  const sendSurface = async () => {
    if (closed) return;
    try {
      const surface = await composeLiveDashboardSurface(user);
      res.write(`event: surface\n`);
      res.write(`data: ${JSON.stringify({ ok: true, surface })}\n\n`);
  } catch (err) {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ ok: false, error: err?.message || 'erro' })}\n\n`);
    }
  };

  await sendSurface();

  const tickId = setInterval(sendSurface, 15000);
  const keepAliveId = setInterval(() => {
    if (!closed) res.write(`: keepalive ${Date.now()}\n\n`);
  }, 25000);

  req.on('close', () => {
    closed = true;
    clearInterval(tickId);
    clearInterval(keepAliveId);
    res.end();
  });
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

/**
 * POST /dashboard/chat
 * Assistente Impetus IA no chat (fluxo simples GPT — não substitui o Conselho Cognitivo).
 * Body: { message: string, history?: { role, content }[] }
 */
router.post('/chat', requireAuth, async (req, res) => {
  try {
    const message = String(req.body?.message ?? '').trim();
    const voicePanelContext = String(req.body?.voice_panel_context ?? '')
      .trim()
      .slice(0, 6000);
    if (!message) {
      return res.status(400).json({ ok: false, error: 'Mensagem vazia.' });
    }
    const { analyzePrompt } = require('../middleware/promptFirewall');
    const pfChat = await analyzePrompt(message, req.user);
    if (!pfChat.allowed) {
      return res.status(403).json({
        ok: false,
        error: pfChat.message || pfChat.reason || 'Conteúdo não permitido.',
        code: pfChat.reason
      });
    }
    const humanValidationClosureService = require('../services/humanValidationClosureService');
    const modalityHint = req.body?.validation_modality === 'VIDEO' ? 'VIDEO' : 'TEXT';
    const gestureDescription =
      req.body?.gesture_description != null ? String(req.body.gesture_description).slice(0, 4000) : '';
    let hitlClosure = null;
    try {
      hitlClosure = await humanValidationClosureService.tryClosePendingValidation({
        user: req.user,
        utterance: message,
        modality: modalityHint,
        gestureDescription: gestureDescription || undefined
      });
      } catch (e) {
      console.warn('[HITL_CHAT]', e?.message);
    }
    const historyRaw = Array.isArray(req.body?.history) ? req.body.history : [];
    const history = historyRaw
      .slice(-24)
      .map((m) => ({
        role: m && m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m?.content ?? '').slice(0, 16000)
      }))
      .filter((m) => m.content.length > 0);

    const u = req.user;

    const { v4: uuidv4 } = require('uuid');
    const traceId = uuidv4();
    const {
      buildProactiveContextFromSession,
      formatAutonomousContextAppendixForPrompt
    } = require('../services/proactiveRetrievalService');
    const { runAutonomousPreflight } = require('../ai/cognitiveOrchestrator');

    const miniDossier = {
      trace_id: traceId,
      data: {},
      context: {
        module: 'dashboard_chat',
        request: message.slice(0, 4000),
        intent: 'generico_assistido',
        pipeline_version: 'chat_gpt_json',
        timestamp: new Date().toISOString()
      },
      analysis: {},
      decision: { requires_human_validation: false, risk_level: 'low' },
      meta: {
        models_touched: ['openai']
      }
    };

    let autonomousAppendix = '';
    if (u.company_id && u.id) {
      try {
        const sessionContext = await getUnifiedSessionContext(u);
        const proactiveCtx = buildProactiveContextFromSession(u, sessionContext || {});
        const pre = await runAutonomousPreflight({ user: u, dossier: miniDossier, context: proactiveCtx });
        if (pre.enriched) {
          autonomousAppendix = formatAutonomousContextAppendixForPrompt(miniDossier);
        }
      } catch (e) {
        console.warn('[DASHBOARD_CHAT] autonomous_preflight', e && e.message ? e.message : e);
      }
    }

    let lastAiTrace =
      req.body?.last_ai_trace_id != null ? String(req.body.last_ai_trace_id).trim() : null;
    if (lastAiTrace === '') lastAiTrace = null;

    const { respondIfQualityComplaint } = require('../services/aiComplaintChatBridge');
    if (
      await respondIfQualityComplaint({
        user: u,
        message,
        lastAiTraceId: lastAiTrace,
        res,
        format: 'dashboard'
      })
    ) {
      return;
    }

    let dashboardContextualPack = null;
    if (u.company_id) {
      try {
        const { retrieveContextualData } = require('../services/dataRetrievalService');
        dashboardContextualPack = await retrieveContextualData({
          user: u,
          intent: 'operational_overview',
          entities: {}
        });
      } catch (ctxErr) {
        console.warn('[DASHBOARD_CHAT_CONTEXT]', ctxErr?.message ?? ctxErr);
      }
    }

    let interpretation = null;
    if (dashboardContextualPack) {
      const { interpretContext } = require('../ai/contextInterpretationLayer');
      interpretation = interpretContext({
        data_state: dashboardContextualPack.metrics?.data_state,
        metrics: dashboardContextualPack.metrics
      });
      dashboardContextualPack.interpretation = interpretation;
      console.log('[CONTEXT_INTERPRETATION]', { data_state: interpretation?.data_state });
    }

    const { applyUnifiedPostProcessing } = require('../middleware/forbiddenNarrativeAuditor');

    let unifiedDecision = null;
    if (process.env.UNIFIED_DECISION_ENGINE === 'true') {
      try {
        console.info('[UNIFIED_CHAT_START]', { userId: u.id, company_id: u.company_id });
        const decisionFacadeService = require('../services/decisionFacadeService');
        const facaded = await decisionFacadeService.decide({
          user: u,
          message,
          context: dashboardContextualPack,
          source: 'dashboard_chat',
          skipCognitiveInvocation: true,
          historyLength: history.length
        });
        unifiedDecision = facaded.unified_result != null ? facaded.unified_result : null;
        console.info('[DECISION_FACADE_USED]', facaded?.decision);
        console.info('[UNIFIED_CHAT_RESULT]', {
          hasDecision: !!(unifiedDecision && unifiedDecision.decision),
          escalation: !!(unifiedDecision && unifiedDecision.meta && unifiedDecision.meta.cognitive_escalation),
          pipeline_primary: facaded?.metadata?.source_engine === 'event_pipeline'
        });
      } catch (unifiedErr) {
        console.warn('[UNIFIED_CHAT_FAIL]', unifiedErr?.message ?? unifiedErr);
      }
    }

    const systemInfluence = unifiedDecision?.meta?.system_influence || null;

    let useCognitiveCouncil = false;
    if (
      process.env.UNIFIED_DECISION_USE_TRIADE === 'true' &&
      unifiedDecision &&
      unifiedDecision.meta &&
      unifiedDecision.meta.cognitive_escalation
    ) {
      useCognitiveCouncil = true;
    }

    if (useCognitiveCouncil && u.company_id) {
      try {
        const { runCognitiveCouncil } = require('../ai/cognitiveOrchestrator');
        const councilData = {
          kpis: Array.isArray(dashboardContextualPack?.kpis) ? dashboardContextualPack.kpis : [],
          events: Array.isArray(dashboardContextualPack?.events) ? dashboardContextualPack.events : [],
          assets: Array.isArray(dashboardContextualPack?.assets) ? dashboardContextualPack.assets : [],
          contextual_data:
            dashboardContextualPack?.contextual_data &&
            typeof dashboardContextualPack.contextual_data === 'object'
              ? dashboardContextualPack.contextual_data
              : {}
        };
        const councilResult = await runCognitiveCouncil({
          user: u,
          requestText: message,
          input: { text: message },
          data: councilData,
          context: {
            source: 'dashboard_chat_unified',
            dashboard_history_turns: history.length
          },
          module: 'dashboard_chat',
          options: { skipRecursiveUnified: true }
        });
        if (councilResult && councilResult.ok && councilResult.result) {
          const cr = councilResult.result;
          let textCouncil =
            (typeof cr.answer === 'string' && cr.answer.trim()) ||
            (typeof cr.content === 'string' && cr.content.trim()) ||
            '';
          if (textCouncil.startsWith('FALLBACK:')) textCouncil = '';
          if (textCouncil) {
            const aiEgressGuardCouncil = require('../services/aiEgressGuardService');
            const allowCouncil = aiEgressGuardCouncil.buildTenantAllowlist(u, {});
            const egressCouncil = await aiEgressGuardCouncil.scanModelOutput({
              text: textCouncil,
              allowlist: allowCouncil,
              user: u,
              moduleName: 'dashboard_chat',
              channel: 'dashboard_chat_council'
            });
            textCouncil = egressCouncil.text;
            textCouncil = applyUnifiedPostProcessing({
              text: textCouncil,
              data_state: interpretation?.data_state
            });
            const cognitiveSafetyRuntimeService = require('../services/cognitiveSafetyRuntimeService');
            const safetyCouncil = await cognitiveSafetyRuntimeService.applySafetyToChatText(textCouncil, u);
            textCouncil = safetyCouncil.text;
            const tidCouncil = councilResult.trace_id || councilResult.traceId || traceId;
            res.setHeader('X-AI-Trace-ID', String(tidCouncil));
            if (safetyCouncil.safety_blocked) {
              res.setHeader('X-AI-Cognitive-Safety', 'blocked');
              res.setHeader('X-AI-HITL-Pending', '1');
            } else if (cr.requires_action || (cr.confidence_score != null && cr.confidence_score < 70)) {
              res.setHeader('X-AI-HITL-Pending', '1');
            }
            let processingTransparencyCouncil = councilResult.processing_transparency || null;
            try {
              if (!processingTransparencyCouncil && u.company_id) {
                processingTransparencyCouncil =
                  await require('../services/aiProviderService').getCognitivePipelineDisclosure(u.company_id);
              }
            } catch (_) {
              /* ignore */
            }
            let systemInfluenceMessage = null;
            try {
              systemInfluenceMessage = buildSystemInfluenceMessage(systemInfluence);
  } catch (err) {
              console.warn('[SYSTEM_INFLUENCE_BUILD_FAIL]', err?.message || err);
            }
            if (systemInfluenceMessage) {
              try {
                console.info(
                  '[SYSTEM_INFLUENCE_CHAT]',
                  JSON.stringify({
                    type: systemInfluenceMessage.type,
                    severity: systemInfluenceMessage.severity,
                    company_id: u?.company_id || null
                  })
                );
              } catch (_log) {}
            }
            return res.json({
              ok: true,
              reply: textCouncil,
              message: textCouncil,
              content: typeof cr.content === 'string' ? textCouncil : cr.content,
              explanation_layer: cr.explanation_layer,
              confidence_score: cr.confidence_score,
              requires_action: cr.requires_action,
              degraded: !!councilResult.degraded,
              hitl_closed: hitlClosure?.closed === true,
              hitl_closed_trace: hitlClosure?.closed ? hitlClosure.trace_id : undefined,
              processing_transparency: processingTransparencyCouncil,
              cognitive_council: true,
              system_influence: systemInfluenceMessage || null,
              safety_blocked: !!safetyCouncil.safety_blocked,
              safety_reason: safetyCouncil.reason || undefined
            });
          }
        }
      } catch (cogErr) {
        console.warn('[COGNITIVE_FALLBACK]', cogErr?.message ?? cogErr);
      }
    }

    const isNoData =
      interpretation?.data_state === 'tenant_empty' ||
      interpretation?.data_state === 'tenant_inactive';

    const { buildDashboardChatPrompt } = require('../ai/prompts/dashboardChatPrompt');
    const { buildNoDataPrompt } = require('../ai/prompts/noDataModePrompt');

    const system = isNoData
      ? buildNoDataPrompt({
          user: u,
          data_state: interpretation.data_state,
          briefing: interpretation.briefing,
          must_avoid_phrases: interpretation.must_avoid_phrases,
          must_propose_actions: interpretation.must_propose_actions
        })
      : buildDashboardChatPrompt(
          interpretation
            ? {
                user: u,
                briefing: interpretation.briefing,
                must_avoid_phrases: interpretation.must_avoid_phrases,
                narrative_mode: interpretation.narrative_mode
              }
            : { user: u }
        );

    const lineageCtx = dataLineageService.buildLineageForChatContext({
      messagePreview: message,
      historyTurns: history.length,
      snapshotIso: new Date().toISOString()
    });
    const lineageBlock = `\n\norigem_dados_lineagem (proveniência):\n${JSON.stringify(
      lineageCtx.map((e) => ({
        entidade: e.entity,
        fonte_tecnica: e.origin,
        frescura: e.freshness,
        fiabilidade_0_100: e.reliability_score
      }))
    ).slice(0, 4000)}`;

    let secureGovernanceSystem = '';
    try {
      const secureCtx = await secureContextBuilder.buildContext(u, {
        companyId: u.company_id,
        queryText: message
      });
      if (secureCtx && typeof secureCtx.context === 'string' && secureCtx.context.trim()) {
        secureGovernanceSystem = secureCtx.context.trim();
      }
    } catch (e) {
      console.warn('[DASHBOARD_CHAT] secureContextBuilder', e && e.message ? e.message : e);
    }

    let userTurnContent = message;
    if (dashboardContextualPack) {
      const snippet = JSON.stringify({
        kpis: dashboardContextualPack.kpis,
        events: dashboardContextualPack.events,
        assets: dashboardContextualPack.assets,
        metrics: dashboardContextualPack.metrics,
        contextual_data: dashboardContextualPack.contextual_data
      }).slice(0, 3000);
      if (snippet.length > 2) {
        userTurnContent = `Contexto operacional (resumo fornecido pelo sistema):\n${snippet}\n\nPergunta do utilizador:\n${message}`;
      }
    }
    if (voicePanelContext) {
      userTurnContent = `${userTurnContent}\n\nContexto do último painel visual mostrado ao utilizador:\n${voicePanelContext}\n\nSe a pergunta referir "esse gráfico/painel", baseie a resposta neste contexto visual.`;
    }

    const messages = [
      { role: 'system', content: system },
      ...(secureGovernanceSystem ? [{ role: 'system', content: secureGovernanceSystem }] : []),
      ...history,
      { role: 'user', content: userTurnContent + lineageBlock + autonomousAppendix }
    ];

    const billing = u.company_id ? { companyId: u.company_id, userId: u.id } : null;
    const raw = await ai.chatCompletionMessages(messages, {
      max_tokens: 1600,
      billing,
      response_format: { type: 'json_object' },
      model: process.env.IMPETUS_CHAT_MODEL || 'gpt-4o-mini',
      user: u,
      channel: 'dashboard_chat'
    });

    const degraded = typeof raw === 'string' && raw.startsWith('FALLBACK');
    const limitations = degraded && raw ? [raw] : [];
    const { finalRaw, structuredFinal } = parseFinalStructuredResponse(
      typeof raw === 'string' ? raw : String(raw || '')
    );

    miniDossier.meta = {
      ...miniDossier.meta,
      degraded,
      data_lineage_snapshot: lineageCtx
    };
    miniDossier.context = {
      ...miniDossier.context,
      timestamp: new Date().toISOString()
    };

    const synthesis = synthesize({
      finalRaw: degraded ? String(raw || '') : finalRaw,
      structuredFinal: degraded ? null : structuredFinal,
      dossier: miniDossier,
      validation: null,
      modelsUsed: ['openai'],
      degraded,
      limitations,
      extraBusinessRules: [
        'IMPETUS — Canal chat assistente (GPT); Conselho Cognitivo só quando UNIFIED_DECISION_USE_TRIADE + cognitive_escalation.',
        'Governança: perfil e papel do utilizador restringem o conteúdo operacional.',
        ...(unifiedDecision && unifiedDecision.ok === true && !unifiedDecision.skipped
          ? ['Motor unificado consultado (dashboard_chat) antes da síntese.']
          : [])
      ]
    });

    strategicLearningService.scheduleStrategicLearningAfterCognitiveRun({
      user: u,
      dossier: miniDossier,
      synthesis
    });

    let text = synthesis.answer || '';
    const aiSecurityGateway = require('../services/aiSecurityGateway');
    const gatewayAiEnabled = aiSecurityGateway.isGatewayEnabled();
    let egressChat = { blocked: false, redacted: false, reasons: [] };
    if (!gatewayAiEnabled) {
      const aiEgressGuard = require('../services/aiEgressGuardService');
      const allowChat = aiEgressGuard.buildTenantAllowlist(u, {});
      egressChat = await aiEgressGuard.scanModelOutput({
        text,
        allowlist: allowChat,
        user: u,
        moduleName: 'dashboard_chat',
        channel: 'dashboard_chat'
      });
      text = egressChat.text;
      if (typeof synthesis.content === 'string') synthesis.content = egressChat.text;
    } else if (typeof synthesis.content === 'string') synthesis.content = text;
    text = applyUnifiedPostProcessing({
      text,
      data_state: interpretation?.data_state
    });
    if (typeof synthesis.content === 'string') synthesis.content = text;
    const aiAnalytics = require('../services/aiAnalyticsService');
    text = aiAnalytics.applyStrategicAssistantTextTail(text, {
      metrics: {
        data_state:
          interpretation?.data_state ?? dashboardContextualPack?.metrics?.data_state ?? null
      },
      contextual_pack: dashboardContextualPack || undefined
    });
    if (typeof synthesis.content === 'string') synthesis.content = text;
    const cognitiveSafetyRuntimeService = require('../services/cognitiveSafetyRuntimeService');
    const safetyChat = gatewayAiEnabled
      ? { text, safety_blocked: false }
      : await cognitiveSafetyRuntimeService.applySafetyToChatText(text, u);
    text = safetyChat.text;
    if (typeof synthesis.content === 'string') synthesis.content = text;
    const needsHitlPending =
      !!synthesis.requires_action ||
      (synthesis.confidence_score != null && synthesis.confidence_score < 70) ||
      !!safetyChat.safety_blocked;
    aiAnalytics.enqueueAiTrace({
      trace_id: traceId,
      user_id: u.id,
      company_id: u.company_id,
      module_name: 'dashboard_chat',
      input_payload: {
        user_message: message.slice(0, 8000),
        history_turns: history.length,
        data_lineage: lineageCtx,
        history_excerpt: history.slice(-4).map((m) => ({
          role: m.role,
          content: String(m.content || '').slice(0, 2000)
        }))
      },
      output_response: {
        content: typeof synthesis.content === 'string' ? synthesis.content.slice(0, 20000) : synthesis.content,
        reply: text.slice(0, 20000),
        explanation_layer: synthesis.explanation_layer,
        confidence_score: synthesis.confidence_score,
        requires_action: synthesis.requires_action,
        degraded,
        related_operational_insight_id:
          req.body?.related_operational_insight_id != null
            ? req.body.related_operational_insight_id
            : undefined
      },
      model_info: {
        provider: 'openai',
        model: process.env.IMPETUS_CHAT_MODEL || 'gpt-4o-mini',
        channel: 'dashboard_chat',
        max_tokens: 1600,
        response_format: 'json_object',
        ...(egressChat.blocked || egressChat.redacted ? { egress_filter: egressChat.reasons || [] } : {})
      },
      governance_tags: egressChat.blocked ? ['SECURITY_ALERT'] : undefined,
      system_fingerprint: null,
      human_validation_status: needsHitlPending ? 'PENDING' : null,
      validation_modality: null,
      validation_evidence: null,
      validated_at: null
    });
    res.setHeader('X-AI-Trace-ID', traceId);
    if (needsHitlPending) res.setHeader('X-AI-HITL-Pending', '1');
    if (safetyChat.safety_blocked) res.setHeader('X-AI-Cognitive-Safety', 'blocked');
    let processing_transparency = null;
    try {
      if (u.company_id) {
        processing_transparency = await require('../services/aiProviderService').getProcessingDisclosure(
          u.company_id,
          'chat'
        );
      }
  } catch (err) {
      console.warn('[routes/dashboard][chat_processing_transparency]', err?.message ?? err);
  }
    let systemInfluenceMessage = null;
  try {
      systemInfluenceMessage = buildSystemInfluenceMessage(systemInfluence);
  } catch (err) {
      console.warn('[SYSTEM_INFLUENCE_BUILD_FAIL]', err?.message || err);
    }
    if (systemInfluenceMessage) {
      try {
        console.info(
          '[SYSTEM_INFLUENCE_CHAT]',
          JSON.stringify({
            type: systemInfluenceMessage.type,
            severity: systemInfluenceMessage.severity,
            company_id: u?.company_id || null
          })
        );
      } catch (_log) {}
    }
    res.json({
      ok: true,
      reply: text,
      message: text,
      content: synthesis.content,
      explanation_layer: synthesis.explanation_layer,
      confidence_score: synthesis.confidence_score,
      requires_action: synthesis.requires_action,
      degraded,
      hitl_closed: hitlClosure?.closed === true,
      hitl_closed_trace: hitlClosure?.closed ? hitlClosure.trace_id : undefined,
      processing_transparency,
      system_influence: systemInfluenceMessage || null,
      safety_blocked: !!safetyChat.safety_blocked,
      safety_reason: safetyChat.reason || undefined
    });
  } catch (err) {
    console.error('[DASHBOARD_CHAT]', err);
    res.status(500).json({
      ok: false,
      error: buildSafeChatErrorMessage(err, 'Erro temporário no assistente Impetus IA.')
    });
  }
});

/**
 * POST /dashboard/chat-multimodal
 * Texto + imagem (base64) + contexto de ficheiro; mesma política de reclamação que /dashboard/chat.
 */
router.post('/chat-multimodal', requireAuth, async (req, res) => {
  try {
    const message = String(req.body?.message ?? '').trim();
    const hasImage = !!req.body?.imageBase64;
    const fileCtx = req.body?.fileContext && typeof req.body.fileContext === 'object' ? req.body.fileContext : null;
    if (!message && !hasImage && !fileCtx) {
      return res.status(400).json({ ok: false, error: 'Envie texto, imagem ou ficheiro.' });
    }

    const u = req.user;
    if (!u?.company_id) {
      return res.status(403).json({ ok: false, error: 'Empresa não identificada.' });
    }

    const scanMultimodal = [
      message,
      fileCtx?.originalName,
      typeof fileCtx?.extractedText === 'string' ? fileCtx.extractedText.slice(0, 8000) : ''
    ]
      .filter(Boolean)
      .join('\n')
      .slice(0, 120000);
    if (scanMultimodal.trim()) {
      const { analyzePrompt: analyzePromptMm } = require('../middleware/promptFirewall');
      const pfMm = await analyzePromptMm(scanMultimodal, u);
      if (!pfMm.allowed) {
        return res.status(403).json({
          ok: false,
          error: pfMm.message || pfMm.reason || 'Conteúdo não permitido.',
          code: pfMm.reason
        });
      }
    }

    let lastAiTrace =
      req.body?.last_ai_trace_id != null ? String(req.body.last_ai_trace_id).trim() : null;
    if (lastAiTrace === '') lastAiTrace = null;

    const complaintText = message || '';
    const { respondIfQualityComplaint } = require('../services/aiComplaintChatBridge');
    if (
      complaintText &&
      (await respondIfQualityComplaint({
        user: u,
        message: complaintText,
        lastAiTraceId: lastAiTrace,
        res,
        format: 'dashboard'
      }))
    ) {
      return;
    }

    const historyRaw = Array.isArray(req.body?.history) ? req.body.history : [];
    const history = historyRaw
      .slice(-8)
      .map((m) => ({
        role: m && m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m?.content ?? '').slice(0, 16000)
      }))
      .filter((m) => m.content.length > 0);

    const multimodalChatService = require('../services/multimodalChatService');
    const userName = u.name || u.email || 'Usuário';
    const rawOut = await multimodalChatService.processMultimodalChat({
      message: message || 'Analise o conteúdo anexado.',
      history,
      imageBase64: hasImage ? req.body.imageBase64 : null,
      fileContext: fileCtx,
      companyId: u.company_id,
      userName
    });

    let text = '';
    if (typeof rawOut === 'string') text = rawOut;
    else if (rawOut && typeof rawOut === 'object') {
      text = String(rawOut.content || rawOut.message || rawOut.text || JSON.stringify(rawOut)).trim();
    }
    text = text.slice(0, 20000);

    const aiEgressMm = require('../services/aiEgressGuardService');
    const allowMm = aiEgressMm.buildTenantAllowlist(u, fileCtx || {});
    const egressMm = await aiEgressMm.scanModelOutput({
      text,
      allowlist: allowMm,
      user: u,
      moduleName: 'dashboard_chat_multimodal',
      channel: 'dashboard_multimodal'
    });
    text = egressMm.text;

    const traceId = require('uuid').v4();
    const lineageCtx = dataLineageService.buildLineageForChatContext({
      messagePreview: (message || 'multimodal').slice(0, 2000),
      historyTurns: history.length,
      snapshotIso: new Date().toISOString()
    });

    const aiAnalytics = require('../services/aiAnalyticsService');
    aiAnalytics.enqueueAiTrace({
      trace_id: traceId,
      user_id: u.id,
      company_id: u.company_id,
      module_name: 'dashboard_chat_multimodal',
      input_payload: {
        user_message: message.slice(0, 8000),
        has_image: hasImage,
        file_context_meta: fileCtx
          ? {
              originalName: fileCtx.originalName,
              has_extracted: !!fileCtx.extractedText
            }
          : null,
        history_turns: history.length,
        data_lineage: lineageCtx
      },
      output_response: {
        reply: text,
        modality: hasImage ? 'vision' : fileCtx ? 'document' : 'text'
      },
      model_info: {
        provider: 'openai',
        channel: 'chatWithVision',
        multimodal: true,
        ...(egressMm.blocked || egressMm.redacted ? { egress_filter: egressMm.reasons || [] } : {})
      },
      system_fingerprint: null,
      human_validation_status: null,
      validation_modality: null,
      validation_evidence: null,
      validated_at: null,
      governance_tags: egressMm.blocked ? ['SECURITY_ALERT'] : undefined
    });

    res.setHeader('X-AI-Trace-ID', traceId);
    let processing_transparency = null;
    try {
      processing_transparency = await require('../services/aiProviderService').getProcessingDisclosure(
        u.company_id,
        'chat'
      );
  } catch (err) {
      console.warn('[routes/dashboard][multimodal_processing_transparency]', err?.message ?? err);
    }
    res.json({ ok: true, reply: text, message: text, content: text, processing_transparency });
  } catch (err) {
    console.error('[DASHBOARD_CHAT_MULTIMODAL]', err);
    res.status(500).json({
      ok: false,
      error: buildSafeChatErrorMessage(err, 'Erro temporário no chat multimodal.')
    });
  }
});

module.exports = router;
