'use strict';

/**
 * AIOI-P1N.2 — Certification Drift Detection
 * READ ONLY · detecta regressões estruturais P1A–P1N (14 fases).
 */

const fs = require('fs');
const path = require('path');
const {
  ENTERPRISE_BASELINE_PHASES,
  ENTERPRISE_BASELINE_PHASE_COUNT,
  ENTERPRISE_BASELINE_RANGE,
  P1J_REGISTRY_PHASE_COUNT,
  detectStalePhaseCount
} = require('./aioiEnterprisePhaseChain');

const LAYER = 'AIOI_CERTIFICATION_DRIFT';
const RUNTIME_DIR = path.join(__dirname);
const DOCS_DIR = path.join(__dirname, '../../../../docs');

const ENTERPRISE_DOCS = ENTERPRISE_BASELINE_PHASES.map(p => ({ phase: p.id, doc: p.doc }));

const REQUIRED_SERVICES = Object.freeze([
  'aioiContinuousWorkerService.js',
  'aioiTenantRegistryService.js',
  'aioiDistributedRuntimeService.js',
  'aioiProductionReadinessService.js',
  'aioiCertificationRegistryService.js',
  'aioiDeploymentGovernanceService.js',
  'aioiOperationalDatasetService.js',
  'aioiAuthorizationPolicyService.js',
  'aioiOperationalIntegrityService.js',
  'aioiEnterprisePhaseChain.js'
]);

function detectMissingServices() {
  const missing = [];
  for (const file of REQUIRED_SERVICES) {
    const full = path.join(RUNTIME_DIR, file);
    if (!fs.existsSync(full)) missing.push(file);
  }
  return { missing, all_present: missing.length === 0 };
}

function detectMissingDocumentation() {
  const missing = [];
  for (const entry of ENTERPRISE_DOCS) {
    const full = path.join(DOCS_DIR, entry.doc);
    if (!fs.existsSync(full)) missing.push(entry);
  }
  return {
    missing,
    all_present: missing.length === 0,
    phases_total: ENTERPRISE_DOCS.length,
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT
  };
}

function detectPhaseCountDrift() {
  const documentationConsistency = require('./aioiDocumentationConsistencyService');
  const docStatus = documentationConsistency.generateDocumentationStatus();
  const chain = docStatus.certification_chain;
  const drifts = [];

  const docDrift = detectStalePhaseCount(chain.phases_total, 'documentation_chain');
  if (docDrift) drifts.push(docDrift);

  if (chain.phases_present !== ENTERPRISE_BASELINE_PHASE_COUNT) {
    drifts.push({
      context: 'documentation_chain_present',
      reported_count: chain.phases_present,
      expected_count: ENTERPRISE_BASELINE_PHASE_COUNT,
      stale: true,
      message: `Apenas ${chain.phases_present}/${ENTERPRISE_BASELINE_PHASE_COUNT} fases presentes (${ENTERPRISE_BASELINE_RANGE})`
    });
  }

  if (ENTERPRISE_DOCS.length !== ENTERPRISE_BASELINE_PHASE_COUNT) {
    drifts.push({
      context: 'enterprise_docs_catalog',
      reported_count: ENTERPRISE_DOCS.length,
      expected_count: ENTERPRISE_BASELINE_PHASE_COUNT,
      stale: true,
      message: 'Catálogo ENTERPRISE_DOCS desalinhado da baseline'
    });
  }

  return {
    drifts,
    pass: drifts.length === 0,
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT,
    baseline_range: ENTERPRISE_BASELINE_RANGE
  };
}

function detectBrokenDependencies() {
  const broken = [];
  const modules = [
    'aioiOperationalIntegrityService',
    'aioiCertificationRegistryService',
    'aioiProductionReadinessService',
    'aioiDeploymentGovernanceService',
    'aioiAuthorizationGovernanceService',
    'aioiOperationalCertificationService',
    'aioiDocumentationConsistencyService',
    'aioiEnterprisePhaseChain'
  ];
  for (const mod of modules) {
    try {
      require(path.join(RUNTIME_DIR, mod));
    } catch (err) {
      broken.push({ module: mod, error: err.message });
    }
  }
  return { broken, all_loadable: broken.length === 0 };
}

function detectCertificationRegression() {
  const certificationRegistry = require('./aioiCertificationRegistryService');
  const documentationConsistency = require('./aioiDocumentationConsistencyService');
  const status = certificationRegistry.getCertificationStatus();
  const deps = certificationRegistry.validatePhaseDependencies();
  const docChain = documentationConsistency.validateCertificationChain();
  const regressions = [];

  // P1J registry scoped a P1A–P1I (9) — válido no seu contrato
  if (!status.all_phases_certified) {
    regressions.push({
      type: 'p1j_registry_incomplete',
      scope: 'P1A-P1I',
      phases_certified: status.phases.filter(p => p.certified).length,
      expected_in_scope: P1J_REGISTRY_PHASE_COUNT
    });
  }
  if (!deps.pass) {
    regressions.push({ type: 'p1j_dependency_chain', violations: deps.violations });
  }

  // Baseline enterprise completa P1A–P1N (14)
  if (!docChain.chain_valid || !docChain.phase_count_canonical) {
    regressions.push({
      type: 'baseline_documentation_chain',
      phases_total: docChain.phases_total,
      phases_present: docChain.phases_present,
      expected: ENTERPRISE_BASELINE_PHASE_COUNT,
      violations: docChain.violations
    });
  }

  const docCheck = detectMissingDocumentation();
  if (!docCheck.all_present) {
    regressions.push({ type: 'documentation_missing', count: docCheck.missing.length });
  }

  const phaseDrift = detectPhaseCountDrift();
  if (!phaseDrift.pass) {
    regressions.push({ type: 'phase_count_drift', drifts: phaseDrift.drifts });
  }

  return { regressions, pass: regressions.length === 0 };
}

function generateDriftStatus() {
  const services = detectMissingServices();
  const docs = detectMissingDocumentation();
  const deps = detectBrokenDependencies();
  const phaseCount = detectPhaseCountDrift();
  const regression = detectCertificationRegression();

  const certificationDrift = !services.all_present
    || !docs.all_present
    || docs.phases_total !== ENTERPRISE_BASELINE_PHASE_COUNT
    || !phaseCount.pass
    || !deps.all_loadable
    || !regression.pass;

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    certification_drift: certificationDrift,
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT,
    baseline_range: ENTERPRISE_BASELINE_RANGE,
    services,
    documentation: docs,
    phase_count: phaseCount,
    dependencies: deps,
    regression,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  detectMissingServices,
  detectMissingDocumentation,
  detectPhaseCountDrift,
  detectBrokenDependencies,
  detectCertificationRegression,
  generateDriftStatus,
  LAYER,
  ENTERPRISE_DOCS,
  REQUIRED_SERVICES
};
