'use strict';

/**
 * SEC-13A — Operational Validation Report (antes / durante / depois).
 */

function buildPromotionReport(context) {
  const { moduleStates, validation, promotionRuntime, phase = null } = context;
  const target = phase
    ? moduleStates.find((m) => m.phase === phase)
    : moduleStates.find((m) => m.state === 'READY');

  const online = moduleStates.filter((m) => m.state === 'ONLINE' || m.state === 'MONITORING').length;
  const offline = moduleStates.filter((m) => m.state === 'OFF' || m.state === 'READY').length;

  return {
    schema_version: 'operational_promotion_report_v1',
    reportId: `opr-${Date.now()}`,
    phase: target?.phase || 'ECOSYSTEM',
    generatedAt: new Date().toISOString(),
    antes: {
      modulesOnline: online,
      modulesOffline: offline,
      sequenceValid: promotionRuntime.sequenceValid,
      operationalScore: validation ? (validation.overallPass ? 85 : 60) : null
    },
    durante: {
      nextStep: promotionRuntime.nextPromotionStep?.phase || null,
      violations: promotionRuntime.sequenceViolations,
      validationPass: validation?.overallPass ?? null,
      memoryMb: validation?.runtime?.memory?.heapUsedMb
    },
    depois: {
      targetState: target?.state || 'PENDING',
      healthLatencyMs: target?.health?.latencyMs,
      rollback: target?.rollback || null,
      evidence: {
        auditRoute: target?.auditRoute,
        flag: target?.primaryFlag,
        minObservationMinutes: target?.minObservationMinutes
      }
    },
    health: validation?.moduleChecks || [],
    latency: moduleStates.map((m) => ({ phase: m.phase, ms: m.health?.latencyMs })),
    logs: { prefix: '[SEC-13A]', note: 'Check PM2 logs after each promotion step' },
    rollback: target?.rollback,
    read_only: true,
    auto_execute: false
  };
}

module.exports = { buildPromotionReport };
