'use strict';

/**
 * Modo proativo avançado: decide quando pré-carregar contexto operacional sem substituir o pedido do utilizador.
 */

const { allowsAutonomousOperationalAnalysis } = require('./policyLayer');

let retrieveContextualData = null;
try {
  retrieveContextualData = require('./dataRetrievalService').retrieveContextualData;
} catch (_) {
  retrieveContextualData = null;
}

const RISK_HIGH = new Set(['CRITICAL', 'HIGH']);

/**
 * @param {unknown} v
 * @returns {Array<object>}
 */
function asPredictionList(v) {
  if (Array.isArray(v)) {
    return v;
  }
  if (v && typeof v === 'object' && Array.isArray(v.predictions)) {
    return v.predictions;
  }
  return [];
}

/**
 * @param {object} p
 * @returns {string}
 */
function riskOf(p) {
  if (!p || typeof p !== 'object') {
    return 'OK';
  }
  return String(p.risk_level != null ? p.risk_level : p.priority != null ? p.priority : 'OK')
    .trim()
    .toUpperCase();
}

/**
 * Riscos HIGH/CRITICAL persistentes: ≥2 ocorrências ou o mesmo ativo com HIGH/CRITICAL repetido.
 * @param {unknown} predictions
 * @returns {boolean}
 */
function hasPersistentHighCriticalRisks(predictions) {
  const list = asPredictionList(predictions);
  const high = list.filter((p) => RISK_HIGH.has(riskOf(p)));
  if (high.length < 2) {
    return false;
  }
  const byMachine = new Map();
  for (const p of high) {
    const mid = p.machine_id != null ? String(p.machine_id).trim() : '';
    if (mid) {
      byMachine.set(mid, (byMachine.get(mid) || 0) + 1);
    }
  }
  for (const c of byMachine.values()) {
    if (c >= 2) {
      return true;
    }
  }
  return high.length >= 2;
}

/**
 * Padrões recorrentes detetados recentemente (learned + temporal).
 * @param {object} [ctx]
 * @returns {boolean}
 */
function hasRecentRecurringPatterns(ctx) {
  const learned = ctx && Array.isArray(ctx.learned_patterns) ? ctx.learned_patterns : [];
  const recTypes = new Set(['recurring_machine_failure', 'machine_event_pair', 'operator_failure_load']);
  if (learned.some((p) => p && recTypes.has(String(p.pattern_type || '')))) {
    return true;
  }
  const t = ctx && ctx.temporal_insights && typeof ctx.temporal_insights === 'object' ? ctx.temporal_insights : {};
  const rp = Array.isArray(t.recurring_patterns) ? t.recurring_patterns : [];
  if (rp.length >= 1) {
    return true;
  }
  return false;
}

/**
 * Falhas em sequência: vários eventos tipo-falha recentes (resumo) ou sinal explícito.
 * @param {object} [ctx]
 * @returns {boolean}
 */
function hasSequentialFailureSignal(ctx) {
  if (ctx && ctx.sequential_failures === true) {
    return true;
  }
  const n = ctx && ctx.failure_like_recent_count != null ? parseInt(ctx.failure_like_recent_count, 10) : 0;
  if (Number.isFinite(n) && n >= 3) {
    return true;
  }
  const ev = ctx && Array.isArray(ctx.recent_events) ? ctx.recent_events : [];
  if (ev.length < 3) {
    return false;
  }
  const re = /falha|parada|down|emerg|alarm|crit|fail|erro|trip|falh/i;
  let c = 0;
  for (const e of ev.slice(0, 30)) {
    if (!e || typeof e !== 'object') {
      continue;
    }
    const s = e.severity != null ? String(e.severity) : '';
    const et = e.event_type != null ? String(e.event_type) : '';
    if (re.test(s) || re.test(et)) {
      c += 1;
    }
  }
  return c >= 3;
}

/**
 * Avalia se deve disparar análise autónoma (heurística; sem ML).
 * `context` pode incluir: `user`, `predictions`, `learned_patterns`, `temporal_insights`, `recent_events`, `failure_like_recent_count`, `sequential_failures`
 *
 * @param {object|null|undefined} context
 * @returns {boolean}
 */
function shouldTriggerAutonomousAnalysis(context) {
  const ctx = context && typeof context === 'object' ? context : {};
  const user = ctx.user;
  if (!allowsAutonomousOperationalAnalysis(user)) {
    return false;
  }
  if (hasPersistentHighCriticalRisks(ctx.predictions)) {
    return true;
  }
  if (hasRecentRecurringPatterns(ctx)) {
    return true;
  }
  if (hasSequentialFailureSignal(ctx)) {
    return true;
  }
  return false;
}

/**
 * @param {object|null|undefined} context
 * @returns {{
 *   trigger_reason: string,
 *   inferred_intent: 'operational_overview',
 *   confidence: number
 * }}
 */
function buildAutonomousContext(context) {
  const ctx = context && typeof context === 'object' ? context : {};
  const reasons = [];
  let score = 0;
  if (hasPersistentHighCriticalRisks(ctx.predictions)) {
    reasons.push('riscos_HIGH_CRITICAL_persistentes');
    score += 0.38;
  }
  if (hasRecentRecurringPatterns(ctx)) {
    reasons.push('padroes_recorrentes_recentes');
    score += 0.32;
  }
  if (hasSequentialFailureSignal(ctx)) {
    reasons.push('falhas_em_sequencia');
    score += 0.3;
  }
  const confidence = Math.min(1, Math.round((score + Number.EPSILON) * 100) / 100);
  const trigger_reason = reasons.length ? reasons.join(' + ') : 'sinais_operacionais';
  return {
    trigger_reason,
    inferred_intent: 'operational_overview',
    confidence
  };
}

/**
 * Pré-executa `retrieveContextualData` (operational_overview) e devolve dados para enriquecimento.
 * Não modifica o fluxo do utilizador — apenas fornece payload para merge.
 *
 * @param {object} params
 * @param {object} params.user
 * @param {object} [params.context] — sinais (predictions, learned_patterns, etc.)
 * @returns {Promise<{ triggered: boolean, autonomous?: object, retrieval?: object }>}
 */
async function runAutonomousRetrievalIfTriggered({ user, context = {} } = {}) {
  const merged = { ...context, user: user != null ? user : context.user };
  if (!shouldTriggerAutonomousAnalysis(merged)) {
    return { triggered: false };
  }
  if (typeof retrieveContextualData !== 'function') {
    const autonomous = buildAutonomousContext(merged);
    console.info('[AUTONOMOUS_ANALYSIS_TRIGGERED]', {
      company_id: user && user.company_id,
      user_id: user && user.id,
      trigger_reason: autonomous.trigger_reason,
      confidence: autonomous.confidence,
      intent: autonomous.inferred_intent,
      note: 'retrieveContextualData_unavailable'
    });
    return { triggered: true, autonomous, retrieval: null };
  }
  const autonomous = buildAutonomousContext(merged);
  let retrieval = null;
  try {
    retrieval = await retrieveContextualData({
      user,
      intent: autonomous.inferred_intent,
      entities: {}
    });
  } catch (e) {
    console.warn('[PROACTIVE_RETRIEVAL] retrieveContextualData', e && e.message ? e.message : e);
  }
  if (autonomous) {
    console.info('[AUTONOMOUS_ANALYSIS_TRIGGERED]', {
      company_id: user && user.company_id,
      user_id: user && user.id,
      trigger_reason: autonomous.trigger_reason,
      confidence: autonomous.confidence,
      intent: autonomous.inferred_intent
    });
  }
  return { triggered: true, autonomous, retrieval };
}

/**
 * Enriquece `dossier.data.contextual_data` com resultado autónomo (merge não destrutivo).
 *
 * @param {object} params
 * @param {object} params.user
 * @param {object} params.dossier
 * @param {object} [params.context] — se omitido, tenta extrair de dossier
 * @returns {Promise<{ enriched: boolean }>}
 */
async function enrichDossierIfTriggered({ user, dossier, context } = {}) {
  if (!user || !dossier || typeof dossier !== 'object') {
    return { enriched: false };
  }
  const ext =
    context && typeof context === 'object'
      ? context
      : buildContextFromDossier(dossier) || {};
  const result = await runAutonomousRetrievalIfTriggered({ user, context: ext });
  if (!result.triggered || !result.autonomous) {
    return { enriched: false };
  }
  dossier.data = dossier.data && typeof dossier.data === 'object' ? dossier.data : {};
  const prev = dossier.data.contextual_data && typeof dossier.data.contextual_data === 'object' ? dossier.data.contextual_data : {};
  const incoming =
    result.retrieval && result.retrieval.contextual_data && typeof result.retrieval.contextual_data === 'object'
      ? result.retrieval.contextual_data
      : {};
  dossier.data.contextual_data = {
    ...prev,
    ...incoming,
    autonomous_prefetch: {
      trigger_reason: result.autonomous.trigger_reason,
      confidence: result.autonomous.confidence,
      inferred_intent: result.autonomous.inferred_intent,
      at: new Date().toISOString()
    }
  };
  dossier.meta = dossier.meta && typeof dossier.meta === 'object' ? dossier.meta : {};
  dossier.meta.autonomous_context_enriched = true;
  return { enriched: true };
}

/**
 * @param {object} dossier
 * @returns {object|null}
 */
function buildContextFromDossier(dossier) {
  const cd = dossier && dossier.data && dossier.data.contextual_data;
  if (!cd || typeof cd !== 'object') {
    return null;
  }
  return {
    predictions: cd.predictions,
    learned_patterns: cd.learned_patterns,
    temporal_insights: cd.temporal_insights,
    recent_events: Array.isArray(cd.recent_events) ? cd.recent_events : cd.events,
    failure_like_recent_count: cd.failure_like_recent_count,
    sequential_failures: cd.sequential_failures
  };
}

/**
 * Bloco curto a anexar ao prompt do utilizador quando o pré-carregamento autónomo correu (enriquecimento, não substitui o pedido).
 *
 * @param {object} dossier
 * @param {number} [maxLen]
 * @returns {string}
 */
function formatAutonomousContextAppendixForPrompt(dossier, maxLen = 6000) {
  const meta = dossier && dossier.meta;
  if (!meta || !meta.autonomous_context_enriched) {
    return '';
  }
  const cd = dossier && dossier.data && dossier.data.contextual_data;
  if (!cd || typeof cd !== 'object') {
    return '';
  }
  const { autonomous_prefetch, ...rest } = cd;
  const payload = { contextual_data: rest, autonomous_prefetch };
  const s = JSON.stringify(payload);
  const truncated = s.length > maxLen ? s.slice(0, maxLen) + '...' : s;
  return `\n\n[contexto_operacional_proativo] Dados de apoio (pré-análise autónoma); podes usá-los se forem relevantes. ${truncated}`;
}

/**
 * Mapeia `contextual_meta` da sessão (sem texto livre) para o formato esperado por `shouldTriggerAutonomousAnalysis`.
 *
 * @param {object} user
 * @param {{ contextual_meta?: object }|null|undefined} sessionContext
 * @returns {object}
 */
function buildProactiveContextFromSession(user, sessionContext) {
  const sc = sessionContext && typeof sessionContext === 'object' ? sessionContext : {};
  const meta = sc.contextual_meta && typeof sc.contextual_meta === 'object' ? sc.contextual_meta : {};
  const predictions = [];
  if (Array.isArray(meta.predictions_risk)) {
    for (const pr of meta.predictions_risk) {
      if (pr && typeof pr === 'object') {
        predictions.push({
          machine_id: pr.machine_id,
          risk_level: pr.risk_level != null ? pr.risk_level : pr.risk_band,
          priority: pr.priority
        });
      }
    }
  }
  return {
    user,
    predictions,
    learned_patterns: Array.isArray(meta.learned_patterns) ? meta.learned_patterns : [],
    temporal_insights: meta.temporal_insights && typeof meta.temporal_insights === 'object' ? meta.temporal_insights : undefined,
    recent_events: Array.isArray(meta.recent_events) ? meta.recent_events : Array.isArray(meta.events) ? meta.events : [],
    failure_like_recent_count: meta.failure_like_recent_count,
    sequential_failures: meta.sequential_failures === true
  };
}

/**
 * Pré-recolha de overview operacional: combina sinais do dossiê corrente com contextual_meta da sessão (unificada ou BD).
 *
 * @param {object} [opts]
 * @param {boolean} [opts.hasExplicitClientData]
 * @param {string} [opts.companyId]
 * @param {object} [opts.user]
 * @param {object} [opts.intentData]
 * @param {object} [opts.enrichedData]
 * @param {object|null} [opts.sessionContext]
 * @returns {{ trigger: boolean, reason: string }}
 */
function shouldTriggerProactiveRetrieval(opts = {}) {
  const {
    hasExplicitClientData,
    user,
    enrichedData,
    sessionContext,
    proactiveRetrievalUsed
  } = opts;

  if (proactiveRetrievalUsed) {
    return { trigger: false, reason: 'already_used' };
  }
  if (hasExplicitClientData) {
    return { trigger: false, reason: 'explicit_client_data' };
  }
  const u = user && typeof user === 'object' ? user : null;
  if (!u || !u.company_id) {
    return { trigger: false, reason: 'no_user' };
  }

  const fromSession = buildProactiveContextFromSession(u, sessionContext);
  const cd =
    enrichedData && enrichedData.contextual_data && typeof enrichedData.contextual_data === 'object'
      ? enrichedData.contextual_data
      : {};

  const predsCd = asPredictionList(cd.predictions);
  const predsSess = asPredictionList(fromSession.predictions);
  const predictions = [...predsSess, ...predsCd].slice(0, 40);

  const learned = [
    ...(Array.isArray(cd.learned_patterns) ? cd.learned_patterns : []),
    ...(Array.isArray(fromSession.learned_patterns) ? fromSession.learned_patterns : [])
  ];
  const temporal_insights =
    cd.temporal_insights && typeof cd.temporal_insights === 'object'
      ? cd.temporal_insights
      : fromSession.temporal_insights;

  const evCd = Array.isArray(cd.recent_events) ? cd.recent_events : Array.isArray(cd.events) ? cd.events : [];
  const evS = Array.isArray(fromSession.recent_events) ? fromSession.recent_events : [];
  const recent_events = [...evS, ...evCd].slice(0, 50);

  const fCd = cd.failure_like_recent_count != null ? parseInt(String(cd.failure_like_recent_count), 10) : 0;
  const fS =
    fromSession.failure_like_recent_count != null ? parseInt(String(fromSession.failure_like_recent_count), 10) : 0;
  const failure_like_recent_count = Math.max(
    Number.isFinite(fCd) ? fCd : 0,
    Number.isFinite(fS) ? fS : 0
  );
  const sequential_failures = cd.sequential_failures === true || fromSession.sequential_failures === true;

  const ctx = {
    user: u,
    predictions,
    learned_patterns: learned,
    temporal_insights,
    recent_events,
    failure_like_recent_count,
    sequential_failures
  };

  if (!shouldTriggerAutonomousAnalysis(ctx)) {
    return { trigger: false, reason: 'autonomous_threshold' };
  }

  return { trigger: true, reason: 'session_or_enriched_signals' };
}

module.exports = {
  shouldTriggerAutonomousAnalysis,
  shouldTriggerProactiveRetrieval,
  buildAutonomousContext,
  runAutonomousRetrievalIfTriggered,
  enrichDossierIfTriggered,
  buildProactiveContextFromSession,
  formatAutonomousContextAppendixForPrompt
};
