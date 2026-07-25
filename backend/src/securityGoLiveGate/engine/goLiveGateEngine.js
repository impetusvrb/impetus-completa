'use strict';

/**
 * SEC-21A — Orquestrador principal (100% consultivo).
 */

const integrityGate = require('./integrityGateValidator');
const baselineGate = require('./baselineGateValidator');
const moduleGate = require('./moduleGateValidator');
const endpointGate = require('./endpointGateValidator');
const infrastructureGate = require('./infrastructureGateValidator');
const securityGate = require('./securityGateValidator');
const runtimeGate = require('./runtimeGateValidator');
const warningGate = require('./warningGateValidator');
const decisionEngine = require('./goLiveDecisionEngine');
const observation = require('../observation/postActivationObservation');
const store = require('../store/goLiveGateStore');
const metrics = require('../metrics/goLiveGateMetrics');
const flags = require('../config/securityGoLiveGateFlags');

function runGoLiveEvaluation(options = {}) {
  const validators = {
    integrity: integrityGate.validateIntegrityGate(),
    baseline: baselineGate.validateBaselineGate(),
    modules: moduleGate.validateModuleGate(),
    endpoints: endpointGate.validateEndpointGate(),
    infrastructure: infrastructureGate.validateInfrastructureGate(),
    security: securityGate.validateSecurityGate(),
    runtime: runtimeGate.validateRuntimeGate()
  };

  const warnings = warningGate.classifyWarnings(validators);

  let obs = null;
  if (options.runObservation) {
    obs = observation.runPostActivationObservation();
    store.setObservationState(obs);
  }

  const decision = decisionEngine.decide(validators, warnings, obs);
  store.setLastEvaluation(decision);
  metrics.recordEvaluation(decision.goLiveDecision);

  return {
    ok: decision.goLiveDecision === decisionEngine.DECISIONS.APPROVED ||
      decision.goLiveDecision === decisionEngine.DECISIONS.APPROVED_REMARKS,
    gate: decision,
    validators,
    warnings,
    observation: obs,
    evaluatedAt: new Date().toISOString(),
    readOnly: true,
    noRuntimeChanges: true
  };
}

function getAuditPayload() {
  const last = store.getLastEvaluation();
  const obs = store.getObservationState();

  return {
    ok: true,
    phase: 'SEC-21A',
    read_only: true,
    consultive_only: true,
    enabled: flags.isSecurityGoLiveGateEnabled(),
    mode: 'GO_LIVE_GATE',
    no_runtime_changes: true,
    no_flag_activation: true,
    no_pm2_restart: true,
    no_rollback_execution: true,
    dashboard: last || runGoLiveEvaluation({ runObservation: false }).gate,
    observation: obs,
    metrics: metrics.getSnapshot(),
    threshold: { integrity: flags.integrityThreshold() },
    disclaimer:
      'SEC-21A — autoridade final Go-Live; SEC-21 promove, SEC-21A decide; nenhuma alteração runtime'
  };
}

module.exports = {
  runGoLiveEvaluation,
  getAuditPayload
};
