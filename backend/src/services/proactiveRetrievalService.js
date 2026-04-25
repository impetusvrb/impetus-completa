'use strict';

/**
 * Decide se se deve fazer um segundo carregamento operacional (visão geral) fundido ao contexto.
 * Não chama a rede — só lógica. Resposta segura para o orquestrador.
 */

const SESSION_RECENT_MS = 30 * 60 * 1000;

/**
 * Há carga operacional mínima já presente (evita busca desnecessária).
 * @param {object|null|undefined} cd
 * @returns {boolean}
 */
function isOperationalContextEmpty(cd) {
  if (!cd || typeof cd !== 'object' || Array.isArray(cd)) {
    return true;
  }
  if (Array.isArray(cd.machines) && cd.machines.length > 0) {
    return false;
  }
  if (Array.isArray(cd.events) && cd.events.length > 0) {
    return false;
  }
  if (Array.isArray(cd.prioritized_actions) && cd.prioritized_actions.length > 0) {
    return false;
  }
  if (Array.isArray(cd.predictions) && cd.predictions.length > 0) {
    return false;
  }
  if (Array.isArray(cd.recent_events) && cd.recent_events.length > 0) {
    return false;
  }
  if (cd.correlation && typeof cd.correlation === 'object') {
    return false;
  }
  if (cd.product && typeof cd.product === 'object') {
    return false;
  }
  if (cd.machine && typeof cd.machine === 'object') {
    return false;
  }
  if (Array.isArray(cd.users) && cd.users.length > 0) {
    return false;
  }
  return true;
}

/**
 * Metadados da última resposta (contextSession) com sinais de risco/pressão.
 * @param {object|null|undefined} meta
 * @returns {boolean}
 */
function hasRiskInLastContextualSummary(meta) {
  if (!meta || typeof meta !== 'object') {
    return false;
  }
  const pn = parseInt(String(meta.prioritized_n), 10);
  if (Number.isFinite(pn) && pn > 0) {
    return true;
  }
  const en = parseInt(String(meta.events_n), 10);
  if (Number.isFinite(en) && en >= 3) {
    return true;
  }
  if (meta.has_correlation === true) {
    return true;
  }
  const cn = parseInt(String(meta.correlation_insights_n), 10);
  if (Number.isFinite(cn) && cn > 0) {
    return true;
  }
  return false;
}

/**
 * Sessão com interação recente e intenções passadas a considerar.
 * @param {object|null|undefined} sc
 * @returns {boolean}
 */
function hasRecentRelevantSessionHistory(sc) {
  if (!sc || typeof sc !== 'object') {
    return false;
  }
  const t = sc.last_interaction_at;
  if (typeof t !== 'number' || t <= 0) {
    return false;
  }
  if (Date.now() - t > SESSION_RECENT_MS) {
    return false;
  }
  return Array.isArray(sc.last_intents) && sc.last_intents.length > 0;
}

/**
 * @typedef {object} ProactiveRetrievalContext
 * @property {boolean} hasExplicitClientData — true se o cliente enviou `data`/`context` (não disparar)
 * @property {string|null|undefined} companyId
 * @property {{ intent?: string }|null|undefined} intentData
 * @property {object|null|undefined} enrichedData — payload acumulado (contextual_data)
 * @property {object|null|undefined} sessionContext — de contextSessionService.getSessionContext
 * @property {string|null|undefined} requestText
 * @property {boolean} [didMultiIntent]
 * @property {boolean} [didAutoInjectOperational] — injeção larga já feita no mesmo request
 * @property {boolean} [proactiveRetrievalUsed] — já se correu proactivo
 */

/**
 * @param {ProactiveRetrievalContext|null|undefined} context
 * @returns {{ trigger: boolean, reason: string }}
 */
function shouldTriggerProactiveRetrieval(context) {
  const ctx = context && typeof context === 'object' ? context : {};
  if (ctx.hasExplicitClientData) {
    return { trigger: false, reason: 'explicit_client_data' };
  }
  if (!ctx.companyId || String(ctx.companyId).trim() === '') {
    return { trigger: false, reason: 'no_company' };
  }
  if (ctx.didMultiIntent) {
    return { trigger: false, reason: 'multi_intent_path' };
  }
  if (ctx.didAutoInjectOperational) {
    return { trigger: false, reason: 'already_operational_injection' };
  }
  if (ctx.proactiveRetrievalUsed) {
    return { trigger: false, reason: 'proactive_limit' };
  }
  if (ctx.intentData && ctx.intentData.intent && ctx.intentData.intent === 'operational_overview') {
    return { trigger: false, reason: 'intent_already_operational' };
  }

  const ed = ctx.enrichedData;
  const cd = ed && ed.contextual_data && typeof ed.contextual_data === 'object' ? ed.contextual_data : null;
  const empty = isOperationalContextEmpty(cd);
  const sc = ctx.sessionContext;
  const lastMeta = sc && sc.last_contextual_data && typeof sc.last_contextual_data === 'object' ? sc.last_contextual_data : null;
  const riskLast = hasRiskInLastContextualSummary(lastMeta);
  const historyOk = hasRecentRelevantSessionHistory(sc);

  if (empty && riskLast) {
    return { trigger: true, reason: 'risk_in_last_context' };
  }
  if (empty && historyOk) {
    return { trigger: true, reason: 'empty_with_recent_session' };
  }

  return { trigger: false, reason: 'no_criteria' };
}

module.exports = {
  shouldTriggerProactiveRetrieval,
  isOperationalContextEmpty
};
