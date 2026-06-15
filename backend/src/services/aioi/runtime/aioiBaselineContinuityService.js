'use strict';

/**
 * AIOI-P1Q.5 — Baseline Continuity Certification
 * READ ONLY · valida preservação + recuperação + reprodutibilidade + rastreabilidade.
 */

const baselinePreservation = require('./aioiBaselinePreservationService');
const baselineRecovery = require('./aioiBaselineRecoveryService');
const reproducibility = require('./aioiBaselineReproducibilityService');
const baselineTraceability = require('./aioiBaselineTraceabilityService');
const continuousWorker = require('./aioiContinuousWorkerService');
const { ENTERPRISE_BASELINE_PHASE_COUNT, ENTERPRISE_BASELINE_RANGE } = require('./aioiEnterprisePhaseChain');

const LAYER = 'AIOI_BASELINE_CONTINUITY';

async function generateContinuityStatus() {
  const preservation = baselinePreservation.generatePreservationStatus();
  const recovery = await baselineRecovery.generateRecoveryStatus();
  const repro = reproducibility.generateReproducibilityStatus();
  const traceability = baselineTraceability.generateTraceabilityStatus();

  const continuityCertified = preservation.baseline_preserved === true
    && recovery.baseline_recoverable === true
    && repro.reproducible === true
    && traceability.traceability_complete === true;

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    continuity_certified: continuityCertified,
    checks: {
      preservation: preservation.baseline_preserved,
      recovery: recovery.baseline_recoverable,
      reproducibility: repro.reproducible,
      traceability: traceability.traceability_complete
    },
    preservation,
    recovery,
    reproducibility: repro,
    traceability,
    baseline_range: ENTERPRISE_BASELINE_RANGE,
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT,
    invariants: continuousWorker.RUNTIME_INVARIANTS,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  generateContinuityStatus,
  LAYER
};
