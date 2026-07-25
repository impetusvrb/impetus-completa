'use strict';

const productionReadiness = require('./productionReadinessValidator');
const runtimeHealth = require('./runtimeHealthValidator');
const endpoints = require('./endpointValidator');
const rollback = require('./rollbackValidator');
const security = require('./securityReadinessValidator');
const guardMonitor = require('./goLiveGuardMonitor');
const decisionEngine = require('./goLiveDecisionEngine');
const store = require('../store/goLiveValidationStore');
const metrics = require('../metrics/goLiveValidationMetrics');
const flags = require('../config/securityGoLiveValidationFlags');
const { sanitizeDiagnosticPayload } = require('../../securityApplication/diagnosticRedaction');

function runGoLiveValidation(options = {}) {
  const validators = {
    production: productionReadiness.validateProductionReadiness(),
    runtime: runtimeHealth.validateRuntimeHealth(),
    endpoints: endpoints.validateEndpoints(),
    security: security.validateSecurityReadiness(),
    rollback: rollback.validateRollback()
  };

  const warnings = [];
  if (flags.skipInfraProbes()) {
    warnings.push({ code: 'SEC21C_INFRA_SKIPPED', message: 'Infra probes skipped (test mode)' });
  }
  if (validators.endpoints.degraded > 0) {
    warnings.push({ code: 'ENDPOINTS_DEGRADED', count: validators.endpoints.degraded });
  }

  let guard = null;
  if (options.runGuard) {
    guard = guardMonitor.runGoLiveGuard();
    store.setGuardState(guard);
    metrics.recordGuard(guard.status);
  }

  const decision = decisionEngine.decide(validators, guard, warnings);
  store.setLastEvaluation({ decision, validators, guard });
  metrics.recordEvaluation(decision.goLiveDecision);

  return {
    ok:
      decision.goLiveDecision === decisionEngine.DECISIONS.APPROVED ||
      decision.goLiveDecision === decisionEngine.DECISIONS.APPROVED_REMARKS,
    decision,
    validators,
    guard,
    warnings,
    evaluatedAt: new Date().toISOString(),
    readOnly: true,
    noRuntimeChanges: true
  };
}

function getAuditPayload() {
  const last = store.getLastEvaluation();
  const payload = last || runGoLiveValidation({ runGuard: false });

  return {
    ok: true,
    phase: 'SEC-21C',
    read_only: true,
    consultive_only: true,
    enabled: flags.isSecurityGoLiveValidationEnabled(),
    mode: 'GO_LIVE_VALIDATION',
    no_runtime_changes: true,
    no_auto_apply: true,
    final_authorization: true,
    dashboard: sanitizeDiagnosticPayload(payload.decision),
    guard: sanitizeDiagnosticPayload(store.getGuardState()),
    metrics: metrics.getSnapshot(),
    threshold: { integrity: flags.integrityThreshold() },
    disclaimer:
      'SEC-21C — autorização final Go-Live; única autorização válida para apply-sec21-activation.sh --apply'
  };
}

module.exports = {
  runGoLiveValidation,
  getAuditPayload
};
