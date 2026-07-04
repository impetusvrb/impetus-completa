'use strict';

/**
 * SEC-18 — Runtime Risk Engine.
 */

const metrics = require('../metrics/runtimeProtectionMetrics');

function assessRuntimeRisk(context, incidents) {
  const open = (incidents || []).filter((i) => i.status === 'OPEN');
  const critical = open.filter((i) => i.severity === 'CRITICAL').length;
  const high = open.filter((i) => i.severity === 'HIGH').length;

  const sec04 = context.sec04?.snapshot || {};
  const sec14 = context.sec14?.dashboard || {};
  const sec15 = context.sec15?.dashboard || {};
  const sec16 = context.sec16?.dashboard || {};
  const sec17 = context.sec17?.dashboard || {};
  const sec10 = context.sec10?.dashboard || {};
  const sec12 = context.sec12?.dashboard || {};

  const integrityOk = sec04.integrityStatus === 'OK' || sec04.integrityStatus === 'HEALTHY';
  const blockingConf = sec14.exfiltrationConfidence ?? sec14.behaviorScore ?? 0;
  const scannerConf = sec15.scannerConfidence ?? 0;
  const deceptionConf = sec16.deceptionConfidence ?? 0;
  const exfilConf = sec17.exfiltrationConfidence ?? 0;
  const threatLevel = sec10.threatLevel || 'LOW';
  const readiness = sec12.readinessScore ?? 100;

  let runtimeRiskScore = 0;
  runtimeRiskScore += Math.min(0.35, critical * 0.15 + high * 0.08);
  runtimeRiskScore += exfilConf * 0.25;
  runtimeRiskScore += scannerConf * 0.15;
  runtimeRiskScore += deceptionConf * 0.1;
  runtimeRiskScore += (typeof blockingConf === 'number' ? blockingConf / 100 : blockingConf) * 0.1;
  if (!integrityOk) runtimeRiskScore += 0.15;
  if (threatLevel === 'CRITICAL' || threatLevel === 'HIGH') runtimeRiskScore += 0.1;

  runtimeRiskScore = Math.min(1, runtimeRiskScore);

  const exposureScore = Math.min(
    1,
    (sec15.enumerationDetected ? 0.2 : 0) +
      (sec17.dataExposureRisk ?? sec17.confidence?.dataExposureRisk ?? 0) * 0.4 +
      (sec14.blockingStatus === 'QUARANTINE' || sec14.blockingStatus === 'BLOCK_CANDIDATE' ? 0.2 : 0)
  );

  const operationalRisk = Math.min(1, (100 - readiness) / 100 + open.length * 0.05);

  const attackContinuation = Math.min(
    1,
    open.length * 0.1 +
      (incidents.filter((i) => (i.tags || []).includes('recurrence')).length * 0.15) +
      scannerConf * 0.2
  );

  const protectionUrgency = Math.min(
    1,
    runtimeRiskScore * 0.4 + exposureScore * 0.3 + attackContinuation * 0.3
  );

  const assessment = {
    runtimeRiskScore: Math.round(runtimeRiskScore * 100) / 100,
    exposureScore: Math.round(exposureScore * 100) / 100,
    operationalRisk: Math.round(operationalRisk * 100) / 100,
    attackContinuationProbability: Math.round(attackContinuation * 100) / 100,
    protectionUrgency: Math.round(protectionUrgency * 100) / 100,
    openIncidents: open.length,
    integrityOk,
    readinessScore: readiness
  };

  metrics.setGauge('runtime_risk', assessment.runtimeRiskScore);
  return assessment;
}

module.exports = { assessRuntimeRisk };
