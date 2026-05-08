'use strict';

/**
 * Learning Hooks — pontos de extensão preparados para futura IA
 * adaptativa, **sem** implementar adaptação nesta fase.
 *
 * Os hooks são funções idempotentes e sem efeito por defeito. Quando uma
 * implementação for plugada, ela é registada via `register*Handler` e
 * passa a ser invocada pelos services do dashboardEngineV2.
 *
 * Princípios:
 *   - SEM IA AGORA: handlers default são `noop`.
 *   - LOOSE COUPLING: chamada nunca lança; falhas silenciadas.
 *   - DETERMINISTIC: ordem de registo preservada.
 */

const _handlers = {
  onWidgetSelection: [],     // (selection, identity, user) → void
  onUsageEvent: [],          // (event) → void
  onDivergenceSignal: [],    // (signal) → void
  onIdentityResolved: [],    // (identity, user) → void
  onPolicyAudit: [],         // (audit_trail, identity) → void
  onFeedbackSubmitted: [],   // (feedback) → void
  // ── Governance / Phase 4 ──────────────────────────────────────────────
  onIntegrityScoreComputed: [], // (score, scope, user?) → void
  onRiskDetected: [],           // (risk, user?) → void
  onRecommendationEmitted: [],  // (recommendation, user?) → void
  onContextDrift: [],           // (drift_signal) → void
  onAnomalyDetected: []         // (anomaly_signal) → void
};

function _safeInvoke(handlers, ...args) {
  for (const h of handlers) {
    try { h(...args); }
    catch (err) {
      if (typeof console !== 'undefined') console.warn('[LEARNING_HOOK_ERROR]', err && err.message ? err.message : err);
    }
  }
}

function registerWidgetSelectionHandler(fn) {
  if (typeof fn === 'function') _handlers.onWidgetSelection.push(fn);
}
function registerUsageHandler(fn) {
  if (typeof fn === 'function') _handlers.onUsageEvent.push(fn);
}
function registerDivergenceHandler(fn) {
  if (typeof fn === 'function') _handlers.onDivergenceSignal.push(fn);
}
function registerIdentityHandler(fn) {
  if (typeof fn === 'function') _handlers.onIdentityResolved.push(fn);
}
function registerPolicyAuditHandler(fn) {
  if (typeof fn === 'function') _handlers.onPolicyAudit.push(fn);
}
function registerFeedbackHandler(fn) {
  if (typeof fn === 'function') _handlers.onFeedbackSubmitted.push(fn);
}

function registerIntegrityScoreHandler(fn) {
  if (typeof fn === 'function') _handlers.onIntegrityScoreComputed.push(fn);
}
function registerRiskHandler(fn) {
  if (typeof fn === 'function') _handlers.onRiskDetected.push(fn);
}
function registerRecommendationHandler(fn) {
  if (typeof fn === 'function') _handlers.onRecommendationEmitted.push(fn);
}
function registerContextDriftHandler(fn) {
  if (typeof fn === 'function') _handlers.onContextDrift.push(fn);
}
function registerAnomalyHandler(fn) {
  if (typeof fn === 'function') _handlers.onAnomalyDetected.push(fn);
}

function clearHandlers() {
  for (const k of Object.keys(_handlers)) _handlers[k].length = 0;
}

// ── Pontos de invocação (chamados pelos services) ───────────────────────

function notifyWidgetSelection({ selection, identity, user }) {
  _safeInvoke(_handlers.onWidgetSelection, selection, identity, user);
}
function notifyUsageEvent(event) {
  _safeInvoke(_handlers.onUsageEvent, event);
}
function notifyDivergence(signal) {
  _safeInvoke(_handlers.onDivergenceSignal, signal);
}
function notifyIdentityResolved({ identity, user }) {
  _safeInvoke(_handlers.onIdentityResolved, identity, user);
}
function notifyPolicyAudit({ audit_trail, identity }) {
  _safeInvoke(_handlers.onPolicyAudit, audit_trail, identity);
}
function notifyFeedback(feedback) {
  _safeInvoke(_handlers.onFeedbackSubmitted, feedback);
}

function notifyIntegrityScore({ score, scope, user }) {
  _safeInvoke(_handlers.onIntegrityScoreComputed, score, scope, user);
}
function notifyRiskDetected({ risk, user }) {
  _safeInvoke(_handlers.onRiskDetected, risk, user);
}
function notifyRecommendationEmitted({ recommendation, user }) {
  _safeInvoke(_handlers.onRecommendationEmitted, recommendation, user);
}
function notifyContextDrift(driftSignal) {
  _safeInvoke(_handlers.onContextDrift, driftSignal);
}
function notifyAnomaly(anomalySignal) {
  _safeInvoke(_handlers.onAnomalyDetected, anomalySignal);
}

module.exports = {
  registerWidgetSelectionHandler,
  registerUsageHandler,
  registerDivergenceHandler,
  registerIdentityHandler,
  registerPolicyAuditHandler,
  registerFeedbackHandler,
  registerIntegrityScoreHandler,
  registerRiskHandler,
  registerRecommendationHandler,
  registerContextDriftHandler,
  registerAnomalyHandler,
  clearHandlers,
  notifyWidgetSelection,
  notifyUsageEvent,
  notifyDivergence,
  notifyIdentityResolved,
  notifyPolicyAudit,
  notifyFeedback,
  notifyIntegrityScore,
  notifyRiskDetected,
  notifyRecommendationEmitted,
  notifyContextDrift,
  notifyAnomaly,
  _handlers
};
