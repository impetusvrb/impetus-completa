'use strict';

/**
 * AIOI-P1O.2 — Release Manifest Service
 * READ ONLY · manifesto consolidado P1A–P1N.
 */

const baselineRegistry = require('./aioiBaselineRegistryService');
const continuousWorker = require('./aioiContinuousWorkerService');

const LAYER = 'AIOI_RELEASE_MANIFEST';

function generateReleaseManifest() {
  const registry = baselineRegistry.getBaselineRegistry();
  const phases = baselineRegistry.getBaselinePhases();

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    baseline: 'P1A-P1N',
    baseline_version: baselineRegistry.BASELINE_VERSION,
    phases: phases.length,
    certified: registry.baseline_registered,
    phase_ids: phases.map(p => p.id),
    invariants: continuousWorker.RUNTIME_INVARIANTS,
    governance_only: true,
    timestamp: new Date().toISOString()
  };
}

function validateManifest() {
  const manifest = generateReleaseManifest();
  const registry = baselineRegistry.getBaselineRegistry();

  const valid = manifest.certified === true
    && manifest.phases === baselineRegistry.BASELINE_PHASES.length
    && registry.baseline_registered === true
    && manifest.invariants.runtime_enabled === false
    && manifest.invariants.runtime_active === false
    && manifest.invariants.runtime_authorized === false;

  return {
    release_manifest_ready: valid,
    manifest,
    validation_pass: valid
  };
}

module.exports = {
  generateReleaseManifest,
  validateManifest,
  LAYER
};
