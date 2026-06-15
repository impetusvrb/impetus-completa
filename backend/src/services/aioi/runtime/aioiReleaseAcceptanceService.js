'use strict';

/**
 * AIOI-P1R.1 — Release Acceptance Service
 * READ ONLY · valida aceitação formal da baseline P1A–P1Q.
 */

const baselineRegistry = require('./aioiBaselineRegistryService');
const releaseManifest = require('./aioiReleaseManifestService');
const baselineFreeze = require('./aioiBaselineFreezeService');
const reproducibility = require('./aioiBaselineReproducibilityService');
const baselineContinuity = require('./aioiBaselineContinuityService');
const continuousWorker = require('./aioiContinuousWorkerService');
const { ENTERPRISE_BASELINE_PHASE_COUNT, ENTERPRISE_BASELINE_RANGE } = require('./aioiEnterprisePhaseChain');

const LAYER = 'AIOI_RELEASE_ACCEPTANCE';

async function generateAcceptanceStatus() {
  const registry = baselineRegistry.getBaselineRegistry();
  const manifest = releaseManifest.validateManifest();
  const freeze = baselineFreeze.generateFreezeStatus();
  const repro = reproducibility.generateReproducibilityStatus();
  const continuity = await baselineContinuity.generateContinuityStatus();

  const releaseAccepted = registry.baseline_registered === true
    && manifest.release_manifest_ready === true
    && freeze.baseline_frozen === true
    && repro.reproducible === true
    && continuity.continuity_certified === true;

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    release_accepted: releaseAccepted,
    checks: {
      registry: registry.baseline_registered,
      manifest: manifest.release_manifest_ready,
      freeze: freeze.baseline_frozen,
      reproducibility: repro.reproducible,
      continuity: continuity.continuity_certified
    },
    registry,
    manifest: manifest.manifest,
    freeze,
    reproducibility: repro,
    continuity,
    baseline_range: ENTERPRISE_BASELINE_RANGE,
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT,
    invariants: continuousWorker.RUNTIME_INVARIANTS,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  generateAcceptanceStatus,
  LAYER
};
