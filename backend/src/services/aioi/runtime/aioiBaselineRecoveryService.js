'use strict';

/**
 * AIOI-P1Q.1 — Baseline Recovery Service
 * READ ONLY · simula recuperação documental da baseline P1A–P1P.
 */

const fs = require('fs');
const path = require('path');
const baselineRegistry = require('./aioiBaselineRegistryService');
const releaseManifest = require('./aioiReleaseManifestService');
const baselineFreeze = require('./aioiBaselineFreezeService');
const reproducibility = require('./aioiBaselineReproducibilityService');
const {
  ENTERPRISE_BASELINE_PHASES,
  ENTERPRISE_BASELINE_PHASE_COUNT,
  ENTERPRISE_BASELINE_RANGE
} = require('./aioiEnterprisePhaseChain');
const continuousWorker = require('./aioiContinuousWorkerService');

const LAYER = 'AIOI_BASELINE_RECOVERY';
const DOCS_DIR = path.join(__dirname, '../../../../docs');

function simulateDocumentationRecovery() {
  const recovered = [];
  const failures = [];
  for (const phase of ENTERPRISE_BASELINE_PHASES) {
    const full = path.join(DOCS_DIR, phase.doc);
    if (fs.existsSync(full)) {
      recovered.push({ phase: phase.id, doc: phase.doc, recoverable: true });
    } else {
      failures.push({ phase: phase.id, doc: phase.doc, recoverable: false });
    }
  }
  return {
    recovered_count: recovered.length,
    expected: ENTERPRISE_BASELINE_PHASE_COUNT,
    failures,
    simulation_pass: failures.length === 0 && recovered.length === ENTERPRISE_BASELINE_PHASE_COUNT
  };
}

async function generateRecoveryStatus() {
  const registry = baselineRegistry.getBaselineRegistry();
  const manifest = releaseManifest.validateManifest();
  const freeze = baselineFreeze.generateFreezeStatus();
  const repro = reproducibility.generateReproducibilityStatus();
  const docRecovery = simulateDocumentationRecovery();

  const baselineRecoverable = registry.baseline_registered === true
    && manifest.release_manifest_ready === true
    && freeze.baseline_frozen === true
    && repro.reproducible === true
    && docRecovery.simulation_pass === true;

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    baseline_recoverable: baselineRecoverable,
    checks: {
      registry: registry.baseline_registered,
      manifest: manifest.release_manifest_ready,
      freeze: freeze.baseline_frozen,
      reproducibility: repro.reproducible,
      documentation_recovery: docRecovery.simulation_pass
    },
    documentation_recovery: docRecovery,
    registry,
    manifest: manifest.manifest,
    freeze,
    reproducibility: repro,
    baseline_range: ENTERPRISE_BASELINE_RANGE,
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT,
    invariants: continuousWorker.RUNTIME_INVARIANTS,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  simulateDocumentationRecovery,
  generateRecoveryStatus,
  LAYER
};
