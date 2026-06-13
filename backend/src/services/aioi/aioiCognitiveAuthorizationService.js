'use strict';

/**
 * AIOI-P9.3 — Cognitive Authorization Service
 *
 * Modelo formal de autorização — todos os níveis não autorizados em P9.
 * Spec: backend/docs/AIOI_COGNITIVE_AUTHORIZATION_SPECIFICATION.md
 */

const LAYER = 'AIOI_COGNITIVE_AUTHORIZATION';

const AUTHORIZATION_LEVELS = [
  'NONE',
  'OBSERVATION',
  'RECOMMENDATION',
  'ASSISTED_DECISION',
  'RESTRICTED_EXECUTION'
];

const INVARIANTS = {
  runtime_enabled:             false,
  runtime_active:                false,
  runtime_authorized:            false,
  cognitive_execution_allowed:   false
};

/**
 * Estado global de autorização cognitiva — P9: tudo desautorizado.
 * @returns {object}
 */
function getAuthorizationState() {
  return {
    ok: true,
    layer: LAYER,
    authorized: false,
    level: 'NONE',
    levels: AUTHORIZATION_LEVELS.map(lvl => ({
      level:      lvl,
      authorized: false
    })),
    invariants: INVARIANTS,
    captured_at: new Date().toISOString()
  };
}

/**
 * Verifica autorização para domínio/ação — sempre não autorizado em P9.
 * @param {string} domain
 * @param {string} [action]
 * @returns {object}
 */
function checkAuthorization(domain, action) {
  return {
    ok: true,
    layer: LAYER,
    domain:          domain || '*',
    action:          action || '*',
    authorized:      false,
    level:           'NONE',
    invariants:      INVARIANTS,
    validation_only: true,
    captured_at:     new Date().toISOString()
  };
}

module.exports = {
  getAuthorizationState,
  checkAuthorization,
  AUTHORIZATION_LEVELS,
  LAYER
};
