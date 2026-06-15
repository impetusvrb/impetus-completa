'use strict';

/**
 * AIOI-P1R.5 — Release Readiness Certification
 * READ ONLY · consolida readiness, compliance, preservation, recovery, continuity.
 */

const productionReadiness = require('./aioiProductionReadinessService');
const complianceGovernance = require('./aioiComplianceGovernanceService');
const baselinePreservation = require('./aioiBaselinePreservationService');
const baselineRecovery = require('./aioiBaselineRecoveryService');
const baselineContinuity = require('./aioiBaselineContinuityService');
const releaseAcceptance = require('./aioiReleaseAcceptanceService');
const continuousWorker = require('./aioiContinuousWorkerService');
const { ENTERPRISE_BASELINE_PHASE_COUNT, ENTERPRISE_BASELINE_RANGE } = require('./aioiEnterprisePhaseChain');

const LAYER = 'AIOI_RELEASE_READINESS';

async function generateReleaseReadinessStatus() {
  let readiness = { overall_ready: false, readiness_score: 0 };
  try {
    readiness = await productionReadiness.generateProductionReadiness();
  } catch { /* observation only */ }

  const compliance = await complianceGovernance.generateComplianceStatus();
  const preservation = baselinePreservation.generatePreservationStatus();
  const recovery = await baselineRecovery.generateRecoveryStatus();
  const continuity = await baselineContinuity.generateContinuityStatus();
  const acceptance = await releaseAcceptance.generateAcceptanceStatus();

  const complianceReady = compliance.integrity?.integrity_verified === true
    && compliance.certification_drift === false
    && compliance.governance?.governance_compliance_ready === true
    && compliance.documentation?.documentation_consistent === true
    && compliance.phase_count_valid !== false;

  const releaseReady = readiness.overall_ready === true
    && complianceReady
    && preservation.baseline_preserved === true
    && recovery.baseline_recoverable === true
    && continuity.continuity_certified === true
    && acceptance.release_accepted === true;

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    release_ready: releaseReady,
    checks: {
      production_readiness: readiness.overall_ready === true,
      compliance: complianceReady,
      preservation: preservation.baseline_preserved === true,
      recovery: recovery.baseline_recoverable === true,
      continuity: continuity.continuity_certified === true,
      acceptance: acceptance.release_accepted === true
    },
    readiness,
    compliance,
    preservation,
    recovery,
    continuity,
    acceptance,
    baseline_range: ENTERPRISE_BASELINE_RANGE,
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT,
    invariants: continuousWorker.RUNTIME_INVARIANTS,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  generateReleaseReadinessStatus,
  LAYER
};
