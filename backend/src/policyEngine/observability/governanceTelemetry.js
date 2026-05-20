'use strict';

const { logPhaseF } = require('./phaseFLogger');

const _metrics = {
  denied_exposure_rate: 0,
  cross_domain_block_rate: 0,
  kpi_denied_rate: 0,
  sanitized_context_rate: 0,
  shadow_divergence_rate: 0,
  governance_conflict_rate: 0,
  _counts: {
    exposure_evaluations: 0,
    denials: 0,
    cross_domain_blocks: 0,
    kpi_denials: 0,
    sanitizations: 0,
    shadow_diffs: 0,
    conflicts: 0
  }
};

function _bump(key, delta = 1) {
  _metrics._counts[key] = (_metrics._counts[key] || 0) + delta;
  _recomputeRates();
}

function _recomputeRates() {
  const c = _metrics._counts;
  const base = Math.max(c.exposure_evaluations, 1);
  _metrics.denied_exposure_rate = Number((c.denials / base).toFixed(4));
  _metrics.cross_domain_block_rate = Number((c.cross_domain_blocks / base).toFixed(4));
  _metrics.kpi_denied_rate = Number((c.kpi_denials / base).toFixed(4));
  _metrics.sanitized_context_rate = Number((c.sanitizations / base).toFixed(4));
  _metrics.shadow_divergence_rate = Number((c.shadow_diffs / base).toFixed(4));
  _metrics.governance_conflict_rate = Number((c.conflicts / base).toFixed(4));
}

function recordExposureEvaluation() {
  _bump('exposure_evaluations');
}

function recordDenial(type = 'generic') {
  _bump('denials');
  if (type === 'cross_domain') _bump('cross_domain_blocks');
  if (type === 'kpi') _bump('kpi_denials');
  logPhaseF('COGNITIVE_GOVERNANCE_METRIC', { metric: 'denial', type, snapshot: getSnapshot() });
}

function recordSanitization(channel) {
  _bump('sanitizations');
  logPhaseF('COGNITIVE_GOVERNANCE_METRIC', { metric: 'sanitized_context', channel, snapshot: getSnapshot() });
}

function recordShadowDivergence(channel, detail) {
  _bump('shadow_diffs');
  logPhaseF('COGNITIVE_GOVERNANCE_SHADOW_DIFF', { channel, ...detail });
}

function recordConflict(channel, reason) {
  _bump('conflicts');
  logPhaseF('COGNITIVE_POLICY_MISMATCH', { channel, reason });
}

function getSnapshot() {
  return {
    denied_exposure_rate: _metrics.denied_exposure_rate,
    cross_domain_block_rate: _metrics.cross_domain_block_rate,
    kpi_denied_rate: _metrics.kpi_denied_rate,
    sanitized_context_rate: _metrics.sanitized_context_rate,
    shadow_divergence_rate: _metrics.shadow_divergence_rate,
    governance_conflict_rate: _metrics.governance_conflict_rate
  };
}

module.exports = {
  recordExposureEvaluation,
  recordDenial,
  recordSanitization,
  recordShadowDivergence,
  recordConflict,
  getSnapshot
};
