'use strict';

/**
 * Cognitive Activation Coordinator
 *
 * Regista, valida e fornece telemetria para a virada de chave dos três
 * componentes cognitivos principais:
 *
 *   1. SZ2 Runtime Z → Z_OPERATIONAL_ASSISTIVE
 *   2. Fase F Chat Governance → IMPETUS_CHAT_GOVERNANCE=on
 *   3. Operational Identity Hardening → enforcement_active=true
 *
 * Pattern: Strategy + Decorator + Circuit-Breaker local.
 *
 * NÃO executa lógica de domínio — apenas coordena activação e
 * emite eventos de telemetria. Cada componente tem fallback autónomo.
 */

const EventEmitter = require('events');

// ── Telemetria interna ──────────────────────────────────────────────────────

const _bus = new EventEmitter();
_bus.setMaxListeners(20);

const _activationLog = [];
const MAX_LOG = 200;

const COMPONENT_IDS = Object.freeze(['sz2_cognitive_os', 'chat_governance_f', 'identity_hardening']);

/** @type {Map<string, 'unknown'|'shadow'|'activating'|'active'|'degraded'|'fallback'>} */
const _states = new Map(COMPONENT_IDS.map((id) => [id, 'unknown']));
const _errors = new Map(COMPONENT_IDS.map((id) => [id, 0]));

// ── Helpers de flag ─────────────────────────────────────────────────────────

function _readEnv() {
  return {
    sz2_stage: process.env.IMPETUS_SZ2_DEFAULT_STAGE || 'Z_COGNITIVE_SHADOW',
    sz3_stage: process.env.IMPETUS_SZ3_DEFAULT_STAGE || 'OBSERVATION_ONLY',
    chat_governance: (process.env.IMPETUS_CHAT_GOVERNANCE || 'off').toLowerCase(),
    governance_shadow: (process.env.IMPETUS_GOVERNANCE_SHADOW_MODE || 'on').toLowerCase(),
    identity_hardening: (process.env.IMPETUS_OPERATIONAL_IDENTITY_HARDENING || 'off').toLowerCase(),
    hierarchy_validation: (process.env.IMPETUS_HIERARCHY_AUTHORITY_VALIDATION || 'off').toLowerCase()
  };
}

// ── Estado esperado após virada de chave ────────────────────────────────────

const EXPECTED_ACTIVE_STATE = Object.freeze({
  sz2_stage: 'Z_OPERATIONAL_ASSISTIVE',
  sz3_stage: 'CALIBRATION_ACTIVE',
  chat_governance: 'on',
  governance_shadow: 'off',
  identity_hardening: 'on',
  hierarchy_validation: 'on'
});

// ── Logging estruturado ─────────────────────────────────────────────────────

function _log(component, event, meta = {}) {
  const entry = {
    ts: new Date().toISOString(),
    component,
    event,
    ...meta
  };
  _activationLog.push(entry);
  if (_activationLog.length > MAX_LOG) _activationLog.shift();
  console.info(`[COGNITIVE_ACTIVATION][${component}] ${event}`, JSON.stringify(meta));
  _bus.emit('activation_event', entry);
}

// ── Validação de prontidão ──────────────────────────────────────────────────

function validateReadiness() {
  const env = _readEnv();
  const issues = [];

  if (!['Z_OPERATIONAL_ASSISTIVE', 'Z_STATEFUL_REASONING', 'Z_COGNITIVE_SOVEREIGN'].includes(env.sz2_stage)) {
    issues.push({ component: 'sz2_cognitive_os', issue: `stage_not_active: ${env.sz2_stage}` });
  }
  if (env.chat_governance !== 'on') {
    issues.push({ component: 'chat_governance_f', issue: `chat_governance_off: ${env.chat_governance}` });
  }
  if (env.identity_hardening !== 'on') {
    issues.push({ component: 'identity_hardening', issue: `hardening_off: ${env.identity_hardening}` });
  }
  if (env.governance_shadow === 'on') {
    issues.push({ component: 'chat_governance_f', issue: 'governance_still_in_shadow_mode' });
  }

  return { ready: issues.length === 0, issues, env };
}

// ── Transição de estado com Circuit-Breaker local ──────────────────────────

/**
 * Marca um componente como activo. Se o componente atingir N erros seguidos,
 * entra em estado 'degraded' e emite evento de alerta.
 */
function recordActivation(componentId) {
  if (!COMPONENT_IDS.includes(componentId)) return;
  _states.set(componentId, 'active');
  _errors.set(componentId, 0);
  _log(componentId, 'COMPONENT_ACTIVATED', { state: 'active' });
  _bus.emit('component_active', { component: componentId });
}

function recordError(componentId, error, fallbackUsed = false) {
  if (!COMPONENT_IDS.includes(componentId)) return;
  const prevErrors = (_errors.get(componentId) || 0) + 1;
  _errors.set(componentId, prevErrors);

  const state = prevErrors >= 3 ? 'degraded' : fallbackUsed ? 'fallback' : 'activating';
  _states.set(componentId, state);

  _log(componentId, prevErrors >= 3 ? 'COMPONENT_DEGRADED' : 'COMPONENT_ERROR', {
    error: error?.message || String(error),
    error_count: prevErrors,
    state,
    fallback_used: fallbackUsed
  });

  if (prevErrors >= 3) {
    _bus.emit('component_degraded', { component: componentId, error_count: prevErrors });
  }
}

function recordFallback(componentId, reason) {
  _states.set(componentId, 'fallback');
  _log(componentId, 'COMPONENT_FALLBACK', { reason, state: 'fallback' });
}

// ── Snapshot e rollback ─────────────────────────────────────────────────────

function getStatus() {
  const env = _readEnv();
  const readiness = validateReadiness();
  return {
    ts: new Date().toISOString(),
    components: Object.fromEntries(_states),
    error_counts: Object.fromEntries(_errors),
    readiness,
    env_snapshot: env,
    activation_log_tail: _activationLog.slice(-20)
  };
}

function getActivationLog() {
  return [..._activationLog];
}

/**
 * Verifica se o sistema está operacional após virada de chave.
 * Usado como health-check mínimo.
 */
function isOperational() {
  const readiness = validateReadiness();
  const active = [..._states.values()].filter((s) => s === 'active').length;
  const degraded = [..._states.values()].filter((s) => s === 'degraded').length;
  return {
    operational: readiness.ready && degraded === 0,
    active_components: active,
    total_components: COMPONENT_IDS.length,
    degraded_components: degraded,
    readiness
  };
}

// ── Inicialização ao boot ───────────────────────────────────────────────────

function bootCheck() {
  const readiness = validateReadiness();
  _log('coordinator', 'BOOT_CHECK', {
    ready: readiness.ready,
    issues: readiness.issues.length,
    env: readiness.env
  });
  if (!readiness.ready) {
    console.warn(
      '[COGNITIVE_ACTIVATION][coordinator] BOOT_CHECK FAILED — issues:',
      JSON.stringify(readiness.issues)
    );
  }
  // Inicializa estados com base no env actual
  const e = readiness.env;
  if (['Z_OPERATIONAL_ASSISTIVE', 'Z_STATEFUL_REASONING', 'Z_COGNITIVE_SOVEREIGN'].includes(e.sz2_stage)) {
    _states.set('sz2_cognitive_os', 'active');
  }
  if (e.chat_governance === 'on' && e.governance_shadow !== 'on') {
    _states.set('chat_governance_f', 'active');
  }
  if (e.identity_hardening === 'on') {
    _states.set('identity_hardening', 'active');
  }
  return readiness;
}

// Boot imediato ao carregar módulo
const _bootResult = bootCheck();

module.exports = {
  COMPONENT_IDS,
  EXPECTED_ACTIVE_STATE,
  validateReadiness,
  recordActivation,
  recordError,
  recordFallback,
  getStatus,
  getActivationLog,
  isOperational,
  on: (event, listener) => _bus.on(event, listener),
  bootResult: _bootResult
};
