'use strict';

/**
 * AIOI-P1O.1 — Baseline Registry Service
 * READ ONLY · cataloga P1A → P1N.
 */

const fs = require('fs');
const path = require('path');
const {
  ENTERPRISE_BASELINE_PHASES,
  ENTERPRISE_BASELINE_PHASE_COUNT,
  ENTERPRISE_BASELINE_RANGE
} = require('./aioiEnterprisePhaseChain');

const LAYER = 'AIOI_BASELINE_REGISTRY';
const DOCS_DIR = path.join(__dirname, '../../../../docs');
const BASELINE_VERSION = 'P1A-P1N-2026.06';

const BASELINE_PHASES = ENTERPRISE_BASELINE_PHASES;

function _docExists(filename) {
  return fs.existsSync(path.join(DOCS_DIR, filename));
}

function getBaselinePhases() {
  return BASELINE_PHASES.map(p => ({
    ...p,
    documentation_present: _docExists(p.doc)
  }));
}

function validateBaselineChain() {
  const phases = getBaselinePhases();
  const present = new Set(phases.filter(p => p.documentation_present).map(p => p.id));
  const violations = [];

  for (const phase of BASELINE_PHASES) {
    if (!present.has(phase.id)) {
      violations.push({ phase: phase.id, type: 'doc_missing' });
    }
    for (const dep of phase.deps) {
      if (!present.has(dep)) {
        violations.push({ phase: phase.id, type: 'dependency_missing', dependency: dep });
      }
    }
  }

  return {
    chain_valid: violations.length === 0,
    phases_total: BASELINE_PHASES.length,
    phases_present: present.size,
    violations
  };
}

function getBaselineRegistry() {
  const chain = validateBaselineChain();
  const phases = getBaselinePhases();

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    baseline_registered: chain.chain_valid && chain.phases_present === ENTERPRISE_BASELINE_PHASE_COUNT,
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT,
    baseline_range: ENTERPRISE_BASELINE_RANGE,
    baseline_version: BASELINE_VERSION,
    phases,
    chain,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  getBaselinePhases,
  validateBaselineChain,
  getBaselineRegistry,
  BASELINE_PHASES,
  BASELINE_VERSION,
  LAYER
};
