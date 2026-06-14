'use strict';

/**
 * AIOI-P1O.4 — Baseline Freeze Certification
 * READ ONLY · certificação formal de congelamento (governança apenas).
 */

const baselineRegistry = require('./aioiBaselineRegistryService');
const releaseManifest = require('./aioiReleaseManifestService');
const reproducibility = require('./aioiBaselineReproducibilityService');
const continuousWorker = require('./aioiContinuousWorkerService');

const LAYER = 'AIOI_BASELINE_FREEZE';

function generateFreezeStatus() {
  const registry = baselineRegistry.getBaselineRegistry();
  const manifest = releaseManifest.validateManifest();
  const repro = reproducibility.generateReproducibilityStatus();
  const inv = continuousWorker.RUNTIME_INVARIANTS;

  const invariantsOk = !inv.runtime_enabled
    && !inv.runtime_active
    && !inv.runtime_authorized
    && !inv.cognitive_execution_allowed
    && inv.auto_execute_band === 'none';

  const baselineFrozen = registry.baseline_registered
    && manifest.release_manifest_ready
    && repro.reproducible
    && invariantsOk;

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    baseline_frozen: baselineFrozen,
    governance_only: true,
    operational_block: false,
    baseline_version: baselineRegistry.BASELINE_VERSION,
    baseline_range: 'P1A-P1N',
    freeze_policy: 'Alterações em componentes certificados requerem nova certificação formal',
    checks: {
      registry: registry.baseline_registered,
      manifest: manifest.release_manifest_ready,
      reproducibility: repro.reproducible,
      invariants: invariantsOk
    },
    invariants: inv,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  generateFreezeStatus,
  LAYER
};
