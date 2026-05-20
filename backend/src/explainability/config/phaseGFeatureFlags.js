'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isGovernanceExplainabilityEnabled: () => _flag('IMPETUS_GOVERNANCE_EXPLAINABILITY', false),
  isGovernanceTraceEnabled: () => _flag('IMPETUS_GOVERNANCE_TRACE', false),
  isGovernanceOversightEnabled: () => _flag('IMPETUS_GOVERNANCE_OVERSIGHT', false),
  isGovernanceDriftDetectionEnabled: () => _flag('IMPETUS_GOVERNANCE_DRIFT_DETECTION', false),
  isGovernanceAuditFeedEnabled: () => _flag('IMPETUS_GOVERNANCE_AUDIT_FEED', false)
};
