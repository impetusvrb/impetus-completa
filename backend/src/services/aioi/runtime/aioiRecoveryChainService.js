'use strict';

/**
 * AIOI-P1Q.2 — Recovery Chain Validation
 * READ ONLY · valida cadeia P1A→P1P recuperável.
 */

const fs = require('fs');
const path = require('path');
const {
  ENTERPRISE_BASELINE_PHASES,
  ENTERPRISE_BASELINE_PHASE_COUNT,
  ENTERPRISE_BASELINE_RANGE,
  detectStalePhaseCount
} = require('./aioiEnterprisePhaseChain');

const LAYER = 'AIOI_RECOVERY_CHAIN';
const RUNTIME_DIR = path.join(__dirname);
const DOCS_DIR = path.join(__dirname, '../../../../docs');

const RECOVERY_SERVICES = Object.freeze([
  'aioiEnterprisePhaseChain.js',
  'aioiBaselineRegistryService.js',
  'aioiReleaseManifestService.js',
  'aioiBaselineRecoveryService.js',
  'aioiRecoveryChainService.js',
  'aioiCertificationRebuildService.js',
  'aioiBaselineContinuityService.js'
]);

function _docExists(filename) {
  return fs.existsSync(path.join(DOCS_DIR, filename));
}

function validateRecoveryChain() {
  const presentIds = new Set();
  const entries = [];
  const gaps = [];

  for (const phase of ENTERPRISE_BASELINE_PHASES) {
    const present = _docExists(phase.doc);
    if (present) presentIds.add(phase.id);
    entries.push({ phase: phase.id, doc: phase.doc, present, dependencies: phase.deps });
    if (!present) gaps.push({ phase: phase.id, type: 'documentation_missing' });
  }

  for (const phase of ENTERPRISE_BASELINE_PHASES) {
    for (const dep of phase.deps) {
      if (!presentIds.has(dep)) {
        gaps.push({ phase: phase.id, type: 'dependency_gap', dependency: dep });
      }
    }
  }

  const phaseDrift = detectStalePhaseCount(presentIds.size, 'recovery_chain');
  if (phaseDrift) gaps.push({ type: 'phase_count_drift', ...phaseDrift });

  const missingServices = RECOVERY_SERVICES.filter(f => !fs.existsSync(path.join(RUNTIME_DIR, f)));
  if (missingServices.length) {
    gaps.push({ type: 'services_missing', files: missingServices });
  }

  return {
    recovery_chain_complete: gaps.length === 0
      && presentIds.size === ENTERPRISE_BASELINE_PHASE_COUNT,
    phases_total: ENTERPRISE_BASELINE_PHASES.length,
    phases_present: presentIds.size,
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT,
    services_present: missingServices.length === 0,
    entries,
    gaps
  };
}

function generateRecoveryChainStatus() {
  const chain = validateRecoveryChain();

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    recovery_chain_complete: chain.recovery_chain_complete,
    chain,
    baseline_range: ENTERPRISE_BASELINE_RANGE,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  validateRecoveryChain,
  generateRecoveryChainStatus,
  RECOVERY_SERVICES,
  LAYER
};
