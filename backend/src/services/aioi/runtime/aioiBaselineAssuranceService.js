'use strict';

/**
 * AIOI-P1P.1 — Baseline Assurance Service
 * READ ONLY · valida registry, manifest, freeze, reproducibility P1O.
 */

const baselineRegistry = require('./aioiBaselineRegistryService');
const releaseManifest = require('./aioiReleaseManifestService');
const baselineFreeze = require('./aioiBaselineFreezeService');
const reproducibility = require('./aioiBaselineReproducibilityService');
const continuousWorker = require('./aioiContinuousWorkerService');

const LAYER = 'AIOI_BASELINE_ASSURANCE';

async function generateAssuranceStatus() {
  const registry = baselineRegistry.getBaselineRegistry();
  const manifest = releaseManifest.validateManifest();
  const freeze = baselineFreeze.generateFreezeStatus();
  const repro = reproducibility.generateReproducibilityStatus();

  const baselineAssured = registry.baseline_registered === true
    && manifest.release_manifest_ready === true
    && freeze.baseline_frozen === true
    && repro.reproducible === true;

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    baseline_assured: baselineAssured,
    checks: {
      registry: registry.baseline_registered,
      manifest: manifest.release_manifest_ready,
      freeze: freeze.baseline_frozen,
      reproducibility: repro.reproducible
    },
    registry,
    manifest: manifest.manifest,
    freeze,
    reproducibility: repro,
    invariants: continuousWorker.RUNTIME_INVARIANTS,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  generateAssuranceStatus,
  LAYER
};
