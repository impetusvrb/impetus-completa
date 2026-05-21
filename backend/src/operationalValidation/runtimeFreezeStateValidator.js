'use strict';

const { logPhaseZ17 } = require('./phaseZ17Logger');
const flags = require('./config/phaseZ17FeatureFlags');

const REQUIRED_FREEZE = Object.freeze({
  final_governance_locked: true,
  governance_locked: true,
  legacy_pipeline_disabled: true,
  reinjection_blocked: true,
  mutation_after_lock_detected: false
});

function validateRuntimeFreezeState(payload = {}) {
  const sgr = payload.sidebar_governance_runtime || {};
  const freeze = payload.governance_freeze_state || {};

  const checks = {
    final_governance_locked: sgr.final_governance_locked === REQUIRED_FREEZE.final_governance_locked,
    governance_locked: freeze.governance_locked === REQUIRED_FREEZE.governance_locked,
    legacy_pipeline_disabled: freeze.legacy_pipeline_disabled === REQUIRED_FREEZE.legacy_pipeline_disabled,
    reinjection_blocked: freeze.reinjection_blocked === REQUIRED_FREEZE.reinjection_blocked,
    mutation_after_lock_detected:
      (freeze.mutation_after_lock_detected ?? false) === REQUIRED_FREEZE.mutation_after_lock_detected
  };

  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
  const valid = failed.length === 0;

  if (!valid && flags.isOperationalValidationObservabilityEnabled()) {
    logPhaseZ17('TERMINAL_GOVERNANCE_BROKEN', { failed, tenant_id: payload.tenant_id });
  }

  return {
    freeze_state_valid: valid,
    checks,
    failed_fields: failed,
    event: valid ? null : 'TERMINAL_GOVERNANCE_BROKEN',
    rollback_recommendation: valid
      ? null
      : {
          action: 'rollback_terminal_lock',
          reason: 'freeze_state_incomplete',
          failed_fields: failed,
          graceful: true
        }
  };
}

module.exports = { validateRuntimeFreezeState, REQUIRED_FREEZE };
