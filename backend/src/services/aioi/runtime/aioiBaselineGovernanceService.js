'use strict';

/**
 * AIOI-P1O — Baseline Orchestrator
 * READ ONLY · consolida registry, manifest, reproducibility, freeze, audit.
 */

const baselineRegistry = require('./aioiBaselineRegistryService');
const releaseManifest = require('./aioiReleaseManifestService');
const reproducibility = require('./aioiBaselineReproducibilityService');
const baselineFreeze = require('./aioiBaselineFreezeService');
const historicalAudit = require('./aioiHistoricalAuditChainService');
const continuousWorker = require('./aioiContinuousWorkerService');
const { ENTERPRISE_BASELINE_PHASE_COUNT, ENTERPRISE_BASELINE_RANGE } = require('./aioiEnterprisePhaseChain');

const LAYER = 'AIOI_BASELINE_GOVERNANCE';

async function generateBaselineStatus() {
  const registry = baselineRegistry.getBaselineRegistry();
  const manifest = releaseManifest.validateManifest();
  const repro = reproducibility.generateReproducibilityStatus();
  const freeze = baselineFreeze.generateFreezeStatus();
  const audit = historicalAudit.generateAuditChainStatus();

  const phaseCountValid = registry.chain?.phases_total === ENTERPRISE_BASELINE_PHASE_COUNT
    && registry.chain?.phases_present === ENTERPRISE_BASELINE_PHASE_COUNT
    && audit.chain?.expected_phases_total === ENTERPRISE_BASELINE_PHASE_COUNT;

  const criteria = {
    baseline_registry_ready: registry.baseline_registered === true && phaseCountValid,
    release_manifest_ready: manifest.release_manifest_ready === true,
    reproducibility_certified: repro.reproducible === true,
    baseline_freeze_certified: freeze.baseline_frozen === true,
    historical_audit_complete: audit.audit_chain_complete === true,
    baseline_dashboard_ready: repro.dashboard?.dashboard_ready === true,
    baseline_api_ready: true,
    enterprise_baseline_ready: false
  };

  const keys = Object.keys(criteria).filter(k => k !== 'enterprise_baseline_ready');
  criteria.enterprise_baseline_ready = keys.every(k => criteria[k] === true);

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    criteria,
    baseline_version: baselineRegistry.BASELINE_VERSION,
    baseline_status: registry.baseline_registered ? 'REGISTERED' : 'INCOMPLETE',
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT,
    baseline_range: ENTERPRISE_BASELINE_RANGE,
    phase_count_valid: phaseCountValid,
    freeze_status: freeze.baseline_frozen ? 'FROZEN' : 'OPEN',
    reproducibility: repro.reproducible,
    certification_chain: registry.chain,
    audit_chain: audit,
    registry,
    manifest: manifest.manifest,
    reproducibility_detail: repro,
    freeze,
    invariants: continuousWorker.RUNTIME_INVARIANTS,
    verdict: criteria.enterprise_baseline_ready
      ? 'AIOI_P1O_ENTERPRISE_BASELINE_PRESERVATION_AND_RELEASE_PASS'
      : 'AIOI_P1O_ENTERPRISE_BASELINE_PRESERVATION_AND_RELEASE_FAIL',
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  generateBaselineStatus,
  LAYER
};
