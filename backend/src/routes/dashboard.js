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
const orchestratorExecutionGate = require('../ai/orchestratorExecutionGate');
const { getUnifiedSessionContext, addResponseFingerprint, getResponseFingerprints } = require('../services/unifiedSessionContextService');
const contextInterpretationLayer = require('../ai/contextInterpretationLayer');
const { buildDashboardChatPrompt } = require('../ai/prompts/dashboardChatPrompt');
const { buildNoDataPrompt } = require('../ai/prompts/noDataModePrompt');
const { auditResponse } = require('../middleware/forbiddenNarrativeAuditor');
const smartSummaryService = require('../services/smartSummary');
const { heavyRouteLimiter } = require('../middleware/globalRateLimit');
const dashboardOperationalBrainRouter = require('./dashboardOperationalBrain');

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

    if (
      process.env.IMPETUS_EVENT_PIPELINE_ENABLED === 'true' &&
      process.env.IMPETUS_EVENT_PIPELINE_SHADOW === 'true' &&
      u &&
      u.id != null
    ) {
      const pct = Number(process.env.IMPETUS_EVENT_PIPELINE_SHADOW_SAMPLE_PCT);
      const sample = Number.isFinite(pct) ? Math.max(0, Math.min(1, pct)) : 0.3;
      if (Math.random() < sample) {
        try {
          const { publishEventDeferred } = require('../eventPipeline/pipeline');
          publishEventDeferred({
            type: 'chat_message',
            source: 'dashboard_chat',
            user: String(u.id),
            payload: {
              company_id: u.company_id,
              text: message.slice(0, 4000),
              context_hint: 'dashboard_chat'
            }
          });
        } catch (err) {
          console.warn(
            '[EVENT_PIPELINE_SHADOW_ERROR]',
            JSON.stringify({
              event: 'EVENT_PIPELINE_SHADOW_ERROR',
              error: err && err.message ? err.message : String(err),
              company_id: u.company_id,
              user_id: u.id
            })
          );
        }
      }
    }

    const { v4: uuidv4 } = require('uuid');
    const traceId = uuidv4();

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
        await getUnifiedSessionContext(u);
      } catch (e) {
        console.warn('[DASHBOARD_CHAT] session_context', e && e.message ? e.message : e);
      }
    }

    let lastAiTrace =
      req.body?.last_ai_trace_id != null ? String(req.body.last_ai_trace_id).trim() : null;
    if (lastAiTrace === '') lastAiTrace = null;

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
    let dataStateHint = null;
    if (dashboardContextualPack && dashboardContextualPack.contextual_data) {
      dataStateHint = dashboardContextualPack.contextual_data.data_state || null;
      try {
        const sessionFingerprints = getResponseFingerprints(u);
        interpretation = contextInterpretationLayer.interpret({
          user: u,
          intent: 'operational_overview',
          data_state: dataStateHint,
          data_completeness: dashboardContextualPack.contextual_data.data_completeness || null,
          coverage: dashboardContextualPack.contextual_data.data_coverage || null,
          session_context: { response_fingerprints: sessionFingerprints }
        });
      } catch (interpErr) {
        console.warn('[CONTEXT_INTERPRETATION]', interpErr?.message ?? interpErr);
      }
    }

    const { respondIfQualityComplaint } = require('../services/aiComplaintChatBridge');
    if (
      await respondIfQualityComplaint({
        user: u,
        message,
        lastAiTraceId: lastAiTrace,
        res,
        format: 'dashboard',
        assistantSummary: history.length > 0 ? history[history.length - 1]?.content?.slice(0, 1500) : null,
        dataStateHint,
        lastTraceCreatedAt: null
      })
    ) {
      return;
    }

    const confirmedAction = req.body?.confirmed_action;
    if (confirmedAction && typeof confirmedAction === 'object' && confirmedAction.id) {
      const actionReply = `Entendido! Vou direcioná-lo para a ação solicitada.`;
      const redirectMap = {
        'open_machine_registration': '/app/equipamentos/cadastrar',
        'open_dashboard_onboarding': '/app/dashboard/onboarding',
        'see_integration_guide': '/app/integracao/guia',
        'check_integrations': '/app/integracao/status'
      };
      const redirect = redirectMap[confirmedAction.id] || null;
      try {
        const observabilityService = require('../services/observabilityService');
        observabilityService.markCooperativeActionAccepted(u.company_id);
      } catch (_) {}
      return res.json({
        ok: true,
        reply: redirect ? `Abrindo: ${confirmedAction.id}` : actionReply,
        message: actionReply,
        content: actionReply,
        redirect,
        cooperative_action_executed: confirmedAction.id,
        explanation_layer: {
          facts_used: ['Ação cooperativa confirmada pelo utilizador.'],
          business_rules: ['Ações cooperativas requerem confirmação explícita.'],
          confidence_score: 100,
          limitations: [],
          reasoning_trace: `Ação ${confirmedAction.id} confirmada.`,
          data_lineage: []
        }
      });
    }

    let unifiedDecision = null;
    if (process.env.UNIFIED_DECISION_ENGINE === 'true') {
      try {
        console.info('[UNIFIED_CHAT_START]', { userId: u.id, company_id: u.company_id });
        if (process.env.USE_DECISION_FACADE === 'true') {
          const decisionFacadeService = require('../services/decisionFacadeService');
          const facaded = await decisionFacadeService.decideWithFacade({
            user: u,
            context: {
              message,
              company_id: u.company_id,
              module: 'dashboard_chat',
              dashboard_history_turns: history.length,
              data_state: dataStateHint
            },
            source: 'dashboard_chat',
            skipCognitiveInvocation: true
          });
          unifiedDecision = facaded.unified_result != null ? facaded.unified_result : null;
          console.info('[DECISION_FACADE_USED]', facaded?.decision);
        } else {
          const unifiedDecisionEngine = require('../services/unifiedDecisionEngine');
          unifiedDecision = await unifiedDecisionEngine.decide({
            user: u,
            context: {
              message,
              company_id: u.company_id,
              module: 'dashboard_chat',
              dashboard_history_turns: history.length,
              data_state: dataStateHint
            },
            source: 'dashboard_chat',
            skipCognitiveInvocation: true
          });
        }
        console.info('[UNIFIED_CHAT_RESULT]', {
          hasDecision: !!(unifiedDecision && unifiedDecision.decision),
          escalation: !!(unifiedDecision && unifiedDecision.meta && unifiedDecision.meta.cognitive_escalation)
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

    /** Com gate do orquestrador activo, o chat deve passar pelo Conselho Cognitivo (pipeline canónico). */
    const forceCouncilForArchitecture =
      orchestratorExecutionGate.isEnforceGate() && !!u.company_id;

    if (u.company_id && (useCognitiveCouncil || forceCouncilForArchitecture)) {
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
          options: { skipRecursiveUnified: true },
          impetusRequestClass: req.impetusRequestClass || 'NORMAL'
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
            const tidCouncil = councilResult.trace_id || councilResult.traceId || traceId;
            res.setHeader('X-AI-Trace-ID', String(tidCouncil));
            if (cr.requires_action || (cr.confidence_score != null && cr.confidence_score < 70)) {
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
              content: typeof cr.content === 'string' ? egressCouncil.text : cr.content,
              explanation_layer: cr.explanation_layer,
              confidence_score: cr.confidence_score,
              requires_action: cr.requires_action,
              degraded: !!councilResult.degraded,
              hitl_closed: hitlClosure?.closed === true,
              hitl_closed_trace: hitlClosure?.closed ? hitlClosure.trace_id : undefined,
              processing_transparency: processingTransparencyCouncil,
              cognitive_council: true,
              system_influence: systemInfluenceMessage || null
            });
          }
        }
      } catch (cogErr) {
        console.warn('[COGNITIVE_FALLBACK]', cogErr?.message ?? cogErr);
      }
    }

    let systemPrompt;
    if (interpretation && (interpretation.narrative_mode === 'no_data_consultative' || interpretation.narrative_mode === 'config_diagnostic')) {
      systemPrompt = buildNoDataPrompt({
        user: u,
        data_state: dataStateHint,
        briefing: interpretation.briefing,
        must_avoid_phrases: interpretation.must_avoid_phrases,
        must_propose_actions: interpretation.must_propose_actions
      });
    } else {
      systemPrompt = buildDashboardChatPrompt({
        user: u,
        briefing: interpretation ? interpretation.briefing : null,
        must_avoid_phrases: interpretation ? interpretation.must_avoid_phrases : [],
        narrative_mode: interpretation ? interpretation.narrative_mode : null,
        contextualDataBlock: null
      });
    }
    const system = systemPrompt;

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
      const ctxRaw =
        dashboardContextualPack.contextual_data && typeof dashboardContextualPack.contextual_data === 'object'
          ? dashboardContextualPack.contextual_data
          : {};
      const operational_overview =
        ctxRaw.operational_overview && typeof ctxRaw.operational_overview === 'object'
          ? ctxRaw.operational_overview
          : null;
      const packForModel = {
        operational_overview,
        metrics: ctxRaw.metrics != null ? ctxRaw.metrics : undefined,
        kpis: dashboardContextualPack.kpis,
        events_sample: Array.isArray(dashboardContextualPack.events)
          ? dashboardContextualPack.events.slice(0, 6)
          : [],
        assets_sample: Array.isArray(dashboardContextualPack.assets)
          ? dashboardContextualPack.assets.slice(0, 6)
          : []
      };
      const snippet = JSON.stringify(packForModel).slice(0, 5200);
      if (snippet.length > 2) {
        userTurnContent = `Contexto operacional (operational_overview e dados de apoio — usar estes factos para respostas específicas):\n${snippet}\n\nPergunta do utilizador:\n${message}`;
      }
    }

    const messages = [
      { role: 'system', content: system },
      ...(secureGovernanceSystem ? [{ role: 'system', content: secureGovernanceSystem }] : []),
      ...history,
      { role: 'user', content: userTurnContent + lineageBlock + autonomousAppendix }
    ];

    const billing = u.company_id ? { companyId: u.company_id, userId: u.id } : null;
    let councilGateSession = null;
    if (orchestratorExecutionGate.isEnforceGate()) {
      councilGateSession = orchestratorExecutionGate.beginCouncilAiSession(traceId);
    }
    let raw;
    try {
      raw = await ai.chatCompletionMessages(messages, {
        max_tokens: 1600,
        billing,
        response_format: { type: 'json_object' },
        model: process.env.IMPETUS_CHAT_MODEL || 'gpt-4o-mini',
        ...(councilGateSession && councilGateSession.openaiToken
          ? { _councilOpenAiToken: councilGateSession.openaiToken }
          : {})
      });
    } finally {
      if (councilGateSession) {
        orchestratorExecutionGate.endCouncilAiSession();
      }
    }

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
        'IMPETUS — Chat dashboard: OpenAI apenas dentro da sessão do orquestrador quando o gate está activo; conselho cognitivo quando configurado ou exigido pela arquitectura.',
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
    const aiEgressGuard = require('../services/aiEgressGuardService');
    const allowChat = aiEgressGuard.buildTenantAllowlist(u, {});
    const egressChat = await aiEgressGuard.scanModelOutput({
      text,
      allowlist: allowChat,
      user: u,
      moduleName: 'dashboard_chat',
      channel: 'dashboard_chat'
    });
    text = egressChat.text;
    if (typeof synthesis.content === 'string') synthesis.content = egressChat.text;
    if (interpretation && interpretation.must_avoid_phrases && interpretation.must_avoid_phrases.length > 0) {
      const auditResult = auditResponse({
        text,
        must_avoid_phrases: interpretation.must_avoid_phrases,
        data_state: dataStateHint,
        narrative_mode: interpretation.narrative_mode
      });
      if (!auditResult.clean) {
        text = auditResult.sanitized_text;
        if (typeof synthesis.content === 'string') synthesis.content = auditResult.sanitized_text;
        try {
          const observabilityService = require('../services/observabilityService');
          observabilityService.markForbiddenPhraseBlocked(u.company_id);
        } catch (_) {}
      }
    }
    try {
      const observabilityService = require('../services/observabilityService');
      if (dataStateHint) observabilityService.markChatDataState(dataStateHint, u.company_id);
      if (interpretation) observabilityService.markBriefingInjected(u.company_id);
      if (interpretation && (interpretation.narrative_mode === 'no_data_consultative' || interpretation.narrative_mode === 'config_diagnostic')) {
        observabilityService.markNoDataModeUsed(u.company_id);
      }
    } catch (_) {}
    const aiAnalytics = require('../services/aiAnalyticsService');
    const needsHitlPending =
      !!synthesis.requires_action || (synthesis.confidence_score != null && synthesis.confidence_score < 70);
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
        channel: 'chatCompletionMessages',
        max_tokens: 1600,
        response_format: 'json_object',
        ...(egressChat.blocked || egressChat.redacted ? { egress_filter: egressChat.reasons || [] } : {})
      },
      governance_tags: egressChat.blocked ? ['SECURITY_ALERT'] : undefined,
      system_fingerprint: null,
      human_validation_status: needsHitlPending ? 'PENDING' : null,
      validation_modality: null,
      validation_evidence: null,
      validated_at: null,
      data_state: dataStateHint,
      narrative_mode: interpretation ? interpretation.narrative_mode : null,
      briefing_signature: interpretation ? interpretation.briefing_signature : null,
      cooperative_actions_offered: interpretation ? interpretation.must_propose_actions : null
    });
    res.setHeader('X-AI-Trace-ID', traceId);
    if (needsHitlPending) res.setHeader('X-AI-HITL-Pending', '1');
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
    if (interpretation && interpretation.briefing_signature) {
      addResponseFingerprint(u, interpretation.briefing_signature);
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
      cooperative_actions: interpretation ? interpretation.must_propose_actions : undefined,
      data_state: dataStateHint || undefined
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

    if (
      process.env.IMPETUS_EVENT_PIPELINE_ENABLED === 'true' &&
      process.env.IMPETUS_EVENT_PIPELINE_SHADOW === 'true' &&
      u &&
      u.id != null &&
      message.trim()
    ) {
      const pctMm = Number(process.env.IMPETUS_EVENT_PIPELINE_SHADOW_SAMPLE_PCT);
      const sampleMm = Number.isFinite(pctMm) ? Math.max(0, Math.min(1, pctMm)) : 0.3;
      if (Math.random() < sampleMm) {
        try {
          const { publishEventDeferred } = require('../eventPipeline/pipeline');
          publishEventDeferred({
            type: 'chat_message',
            source: 'dashboard_chat',
            user: String(u.id),
            payload: {
              company_id: u.company_id,
              text: message.slice(0, 4000),
              context_hint: 'dashboard_chat_multimodal'
            }
          });
        } catch (err) {
          console.warn(
            '[EVENT_PIPELINE_SHADOW_ERROR]',
            JSON.stringify({
              event: 'EVENT_PIPELINE_SHADOW_ERROR',
              error: err && err.message ? err.message : String(err),
              company_id: u.company_id,
              user_id: u.id
            })
          );
        }
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
    const mmTraceId = require('uuid').v4();
    let mmGateSession = null;
    if (orchestratorExecutionGate.isEnforceGate()) {
      mmGateSession = orchestratorExecutionGate.beginCouncilAiSession(mmTraceId);
    }
    let rawOut;
    try {
      rawOut = await multimodalChatService.processMultimodalChat({
        message: message || 'Analise o conteúdo anexado.',
        history,
        imageBase64: hasImage ? req.body.imageBase64 : null,
        fileContext: fileCtx,
        companyId: u.company_id,
        userName,
        ...(mmGateSession && mmGateSession.openaiToken
          ? { _councilOpenAiToken: mmGateSession.openaiToken }
          : {})
      });
    } finally {
      if (mmGateSession) {
        orchestratorExecutionGate.endCouncilAiSession();
      }
    }

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

    const lineageCtx = dataLineageService.buildLineageForChatContext({
      messagePreview: (message || 'multimodal').slice(0, 2000),
      historyTurns: history.length,
      snapshotIso: new Date().toISOString()
    });

    const aiAnalytics = require('../services/aiAnalyticsService');
    aiAnalytics.enqueueAiTrace({
      trace_id: mmTraceId,
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

    res.setHeader('X-AI-Trace-ID', mmTraceId);
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
