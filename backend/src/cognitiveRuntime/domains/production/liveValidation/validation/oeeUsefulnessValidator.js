'use strict';

function validateOeeUsefulness(signalBundle = {}, consolidated = {}) {
  const oee = signalBundle.oee_context || {};
  const genericOee = oee.weighted_oee == null && signalBundle.operational?.efficiency_pct != null;
  const useful = oee.weighted_oee != null && (oee.line_contexts?.length || 0) > 0;
  const emptyScore = oee.weighted_oee == null && signalBundle.telemetry_readiness === 'empty';
  return {
    useful: useful || emptyScore,
    generic_oee: genericOee,
    false_operational: genericOee && !emptyScore,
    contextual_integrity: useful ? 0.9 : emptyScore ? 0.5 : 0.3,
    line_shift_coherence: (oee.line_contexts || []).every((l) => l.line_identifier)
  };
}

module.exports = { validateOeeUsefulness };
