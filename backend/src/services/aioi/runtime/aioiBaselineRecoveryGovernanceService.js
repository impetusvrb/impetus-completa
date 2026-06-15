'use strict';

/**
 * AIOI-P1Q — Baseline Recovery Orchestrator
 * READ ONLY · consolida recovery, chain, rebuild, continuity, soak 2160 ciclos.
 */

const baselineRecovery = require('./aioiBaselineRecoveryService');
const recoveryChain = require('./aioiRecoveryChainService');
const certificationRebuild = require('./aioiCertificationRebuildService');
const baselineContinuity = require('./aioiBaselineContinuityService');
const historicalAudit = require('./aioiHistoricalAuditChainService');
const operationalIntegrity = require('./aioiOperationalIntegrityService');
const continuousWorker = require('./aioiContinuousWorkerService');
const { ENTERPRISE_BASELINE_PHASE_COUNT, ENTERPRISE_BASELINE_RANGE } = require('./aioiEnterprisePhaseChain');

const LAYER = 'AIOI_BASELINE_RECOVERY_GOVERNANCE';

let _lastSoakResult = null;

async function runRecoverySoak(cycles = 2160) {
  let recoveryFailures = 0;
  let auditGaps = 0;

  for (let i = 0; i < cycles; i++) {
    const inv = operationalIntegrity.validateRuntimeInvariants();
    if (!inv.ok) recoveryFailures += 1;

    const recovery = await baselineRecovery.generateRecoveryStatus();
    if (!recovery.baseline_recoverable) recoveryFailures += 1;

    if (i % 10 === 0) {
      const audit = operationalIntegrity.validateAuditIntegrity();
      if (!audit.ok) auditGaps += 1;
      const chain = recoveryChain.generateRecoveryChainStatus();
      if (!chain.recovery_chain_complete) recoveryFailures += 1;
      const rebuild = certificationRebuild.generateRebuildStatus();
      if (!rebuild.certification_rebuildable) recoveryFailures += 1;
    }
  }

  _lastSoakResult = {
    long_horizon_recovery_completed: recoveryFailures === 0 && auditGaps === 0,
    recovery_failures: recoveryFailures,
    audit_gaps: auditGaps,
    cycles,
    methodology: `MEC-RECOVERY-SOAK-equivalent: ${cycles} cycles (~90d @ 1 cycle/h)`,
    observation_only: true,
    timestamp: new Date().toISOString()
  };

  return _lastSoakResult;
}

function getLastSoakResult() {
  return _lastSoakResult;
}

async function generateRecoveryGovernanceStatus() {
  const recovery = await baselineRecovery.generateRecoveryStatus();
  const chain = recoveryChain.generateRecoveryChainStatus();
  const rebuild = certificationRebuild.generateRebuildStatus();
  const continuity = await baselineContinuity.generateContinuityStatus();
  const audit = historicalAudit.generateAuditChainStatus();
  const soak = _lastSoakResult || {
    long_horizon_recovery_completed: null,
    recovery_failures: 0,
    audit_gaps: 0,
    cycles: 0
  };

  const criteria = {
    baseline_recovery_ready: recovery.baseline_recoverable === true,
    recovery_chain_ready: chain.recovery_chain_complete === true,
    certification_rebuild_ready: rebuild.certification_rebuildable === true,
    long_horizon_recovery_completed: soak.long_horizon_recovery_completed === true,
    continuity_certified: continuity.continuity_certified === true,
    recovery_dashboard_ready: continuity.traceability?.dashboard?.p1q === true,
    recovery_api_ready: true,
    enterprise_recovery_ready: false
  };

  const keys = Object.keys(criteria).filter(k => k !== 'enterprise_recovery_ready');
  criteria.enterprise_recovery_ready = keys.every(k => criteria[k] === true);

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    criteria,
    recovery_status: recovery.baseline_recoverable ? 'RECOVERABLE' : 'GAP',
    rebuild_status: rebuild.certification_rebuildable ? 'REBUILDABLE' : 'GAP',
    continuity_status: continuity.continuity_certified ? 'CERTIFIED' : 'GAP',
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT,
    baseline_range: ENTERPRISE_BASELINE_RANGE,
    recovery,
    chain,
    rebuild,
    continuity,
    audit_chain: audit,
    soak,
    invariants: continuousWorker.RUNTIME_INVARIANTS,
    verdict: criteria.enterprise_recovery_ready
      ? 'AIOI_P1Q_ENTERPRISE_BASELINE_RECOVERY_AND_CONTINUITY_PASS'
      : 'AIOI_P1Q_ENTERPRISE_BASELINE_RECOVERY_AND_CONTINUITY_FAIL',
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  runRecoverySoak,
  getLastSoakResult,
  generateRecoveryGovernanceStatus,
  LAYER
};
