'use strict';

/**
 * Feature flags — Fase F (Unified Cognitive Exposure Governance).
 * Governance activa: OFF por defeito.
 * Shadow observability: ON por defeito.
 */

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

let _activationRuntime = null;
function _runtime() {
  if (!_activationRuntime) {
    try {
      _activationRuntime = require('../../governanceActivation/governanceActivationRuntime');
    } catch {
      _activationRuntime = null;
    }
  }
  return _activationRuntime;
}

function _resolve(channel, envName, ctx) {
  if (_flag(envName, false)) return true;
  const rt = _runtime();
  if (!rt) return false;
  return rt.isChannelEffectivelyActive(channel, ctx || {});
}

/**
 * @param {object} [ctx] — { user, tenant_id } para activação controlada Fase I
 */
function isChatGovernanceEnabled(ctx) {
  return _resolve('chat', 'IMPETUS_CHAT_GOVERNANCE', ctx);
}

function isKpiGovernanceEnabled(ctx) {
  return _resolve('kpi', 'IMPETUS_KPI_GOVERNANCE', ctx);
}

function isSummaryGovernanceEnabled(ctx) {
  return _resolve('summary', 'IMPETUS_SUMMARY_GOVERNANCE', ctx);
}

function isCognitiveBoundaryGuardEnabled(ctx) {
  return _resolve('boundary', 'IMPETUS_COGNITIVE_BOUNDARY_GUARD', ctx);
}

module.exports = {
  isChatGovernanceEnabled,
  isKpiGovernanceEnabled,
  isSummaryGovernanceEnabled,
  isCognitiveBoundaryGuardEnabled,
  isGovernanceShadowModeEnabled: () => _flag('IMPETUS_GOVERNANCE_SHADOW_MODE', true),
  _flag
};
