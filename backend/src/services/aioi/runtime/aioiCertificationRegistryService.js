'use strict';

/**
 * AIOI-P1J.2 — Runtime Certification Registry
 * READ ONLY · rastreabilidade P1A–P1I.
 */

const fs = require('fs');
const path = require('path');

const LAYER = 'AIOI_CERTIFICATION_REGISTRY';
const DOCS_DIR = path.join(__dirname, '../../../../docs');

const PHASES = Object.freeze([
  {
    id: 'P1A',
    label: 'Continuous Runtime Foundation',
    verdict: 'AIOI_P1A_CONTINUOUS_RUNTIME_FOUNDATION_PASS',
    doc: 'AIOI_P1A_RUNTIME_AUDIT.md',
    dependencies: []
  },
  {
    id: 'P1B',
    label: 'Continuous Runtime Operation',
    verdict: 'AIOI_P1B_CONTINUOUS_RUNTIME_OPERATION_CERTIFICATION_PASS',
    doc: 'AIOI_P1B_ENTERPRISE_READINESS.md',
    dependencies: ['P1A']
  },
  {
    id: 'P1C',
    label: 'Enterprise Scale',
    verdict: 'AIOI_P1C_ENTERPRISE_SCALE_CERTIFICATION_PASS',
    doc: 'AIOI_P1C_ENTERPRISE_SCALE_READINESS.md',
    dependencies: ['P1B']
  },
  {
    id: 'P1D',
    label: 'Runtime Hardening & Lifecycle',
    verdict: 'AIOI_P1D_ENTERPRISE_RUNTIME_HARDENING_PASS',
    doc: 'AIOI_P1D_ENTERPRISE_RUNTIME_HARDENING.md',
    dependencies: ['P1C']
  },
  {
    id: 'P1E',
    label: 'Horizontal Scale Infrastructure',
    verdict: 'AIOI_P1E_ENTERPRISE_HORIZONTAL_SCALE_PASS',
    doc: 'AIOI_P1E_ENTERPRISE_HORIZONTAL_SCALE.md',
    dependencies: ['P1D']
  },
  {
    id: 'P1F',
    label: 'Horizontal Runtime Validation',
    verdict: 'AIOI_P1F_CONTROLLED_HORIZONTAL_RUNTIME_VALIDATION_PASS',
    doc: 'AIOI_P1F_ENTERPRISE_HORIZONTAL_VALIDATION.md',
    dependencies: ['P1E']
  },
  {
    id: 'P1G',
    label: 'Controlled Horizontal Activation',
    verdict: 'AIOI_P1G_CONTROLLED_HORIZONTAL_ACTIVATION_PASS',
    doc: 'AIOI_P1G_ENTERPRISE_HORIZONTAL_ACTIVATION.md',
    dependencies: ['P1F']
  },
  {
    id: 'P1H',
    label: 'Distributed Worker Activation',
    verdict: 'AIOI_P1H_DISTRIBUTED_WORKER_ACTIVATION_PASS',
    doc: 'AIOI_P1H_ENTERPRISE_DISTRIBUTED_RUNTIME.md',
    dependencies: ['P1G']
  },
  {
    id: 'P1I',
    label: 'Enterprise Distributed Operations',
    verdict: 'AIOI_P1I_ENTERPRISE_DISTRIBUTED_OPERATIONS_PASS',
    doc: 'AIOI_P1I_ENTERPRISE_DISTRIBUTED_OPERATIONS.md',
    dependencies: ['P1H']
  }
]);

function _docExists(filename) {
  try {
    return fs.existsSync(path.join(DOCS_DIR, filename));
  } catch {
    return false;
  }
}

function getCertifiedPhases() {
  return PHASES.map(phase => ({
    ...phase,
    doc_present: _docExists(phase.doc),
    certified: _docExists(phase.doc)
  }));
}

function validatePhaseDependencies() {
  const certified = new Set(
    getCertifiedPhases().filter(p => p.certified).map(p => p.id)
  );
  const violations = [];

  for (const phase of PHASES) {
    for (const dep of phase.dependencies) {
      if (!certified.has(dep)) {
        violations.push({ phase: phase.id, missing_dependency: dep });
      }
    }
  }

  return {
    ok: violations.length === 0,
    layer: LAYER,
    read_only: true,
    phases_total: PHASES.length,
    phases_certified: certified.size,
    violations,
    pass: violations.length === 0
  };
}

function getCertificationStatus() {
  const phases = getCertifiedPhases();
  const deps = validatePhaseDependencies();
  const allCertified = phases.every(p => p.certified);

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    all_phases_certified: allCertified,
    dependency_chain_valid: deps.pass,
    phases,
    dependency_validation: deps,
    latest_phase: phases[phases.length - 1]?.id || null,
    registry_ready: allCertified && deps.pass,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  getCertifiedPhases,
  validatePhaseDependencies,
  getCertificationStatus,
  LAYER,
  PHASES
};
