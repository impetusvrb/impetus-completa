'use strict';

/**
 * AIOI-P1O.3 — Baseline Reproducibility Service
 * READ ONLY · valida reprodutibilidade P1A–P1N.
 */

const fs = require('fs');
const path = require('path');

const baselineRegistry = require('./aioiBaselineRegistryService');
const { ENTERPRISE_BASELINE_PHASE_COUNT, ENTERPRISE_BASELINE_RANGE } = require('./aioiEnterprisePhaseChain');

const LAYER = 'AIOI_BASELINE_REPRODUCIBILITY';
const RUNTIME_DIR = path.join(__dirname);
const ROUTES_DIR = path.join(__dirname, '../../../routes/aioi');
const WIDGET_PATH = path.join(__dirname, '../../../../../frontend/src/features/dashboard/centroComando/WidgetAIOIScale.jsx');

const REQUIRED_SERVICES = Object.freeze([
  'aioiContinuousWorkerService.js',
  'aioiTenantRegistryService.js',
  'aioiDistributedRuntimeService.js',
  'aioiProductionReadinessService.js',
  'aioiCertificationRegistryService.js',
  'aioiDeploymentGovernanceService.js',
  'aioiOperationalCertificationService.js',
  'aioiAuthorizationGovernanceService.js',
  'aioiComplianceGovernanceService.js',
  'aioiOperationalIntegrityService.js',
  'aioiEnterprisePhaseChain.js',
  'aioiBaselineRegistryService.js'
]);

const REQUIRED_ROUTE_FILES = Object.freeze([
  'aioiScaleRoutes.js',
  'aioiProductionRoutes.js',
  'aioiOperationsRoutes.js',
  'aioiAuthorizationRoutes.js',
  'aioiComplianceRoutes.js',
  'aioiBaselineRoutes.js'
]);

const REQUIRED_API_MODULES = Object.freeze([
  'aioiContinuousWorkerService',
  'aioiProductionReadinessService',
  'aioiComplianceGovernanceService',
  'aioiBaselineRegistryService',
  'aioiReleaseManifestService',
  'aioiBaselineReproducibilityService',
  'aioiBaselineFreezeService',
  'aioiHistoricalAuditChainService'
]);

function validateServices() {
  const missing = [];
  for (const file of REQUIRED_SERVICES) {
    if (!fs.existsSync(path.join(RUNTIME_DIR, file))) missing.push(file);
  }
  const broken = [];
  for (const mod of REQUIRED_API_MODULES) {
    try {
      require(path.join(RUNTIME_DIR, mod));
    } catch (err) {
      broken.push({ module: mod, error: err.message });
    }
  }
  return {
    all_present: missing.length === 0,
    all_loadable: broken.length === 0,
    missing,
    broken
  };
}

function validateDocumentation() {
  const phases = baselineRegistry.getBaselinePhases();
  const missing = phases.filter(p => !p.documentation_present).map(p => p.id);
  return {
    all_present: missing.length === 0,
    phases_total: phases.length,
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT,
    baseline_range: ENTERPRISE_BASELINE_RANGE,
    phase_count_canonical: phases.length === ENTERPRISE_BASELINE_PHASE_COUNT,
    missing
  };
}

function validateApis() {
  const missing = [];
  for (const file of REQUIRED_ROUTE_FILES) {
    if (!fs.existsSync(path.join(ROUTES_DIR, file))) missing.push(file);
  }
  const loadable = [];
  for (const file of REQUIRED_ROUTE_FILES) {
    try {
      require(path.join(ROUTES_DIR, file.replace('.js', '')));
    } catch (err) {
      loadable.push({ file, error: err.message });
    }
  }
  return {
    all_registered: missing.length === 0,
    all_loadable: loadable.length === 0,
    missing,
    broken: loadable
  };
}

function validateDashboard() {
  const exists = fs.existsSync(WIDGET_PATH);
  let hasP1N = false;
  let hasP1O = false;
  let hasP1P = false;
  let hasP1Q = false;
  let hasP1R = false;
  if (exists) {
    const content = fs.readFileSync(WIDGET_PATH, 'utf8');
    hasP1N = /P1N|getComplianceStatus/.test(content);
    hasP1O = /P1O|getBaselineStatus/.test(content);
    hasP1P = /P1P|getAssuranceStatus/.test(content);
    hasP1Q = /P1Q|getRecoveryStatus/.test(content);
    hasP1R = /P1R|getReleaseStatus/.test(content);
  }
  return {
    widget_present: exists,
    p1n_section: hasP1N,
    p1o_section: hasP1O,
    p1p_section: hasP1P,
    p1q_section: hasP1Q,
    p1r_section: hasP1R,
    dashboard_ready: exists && hasP1N && hasP1O && hasP1P && hasP1Q && hasP1R
  };
}

function generateReproducibilityStatus() {
  const services = validateServices();
  const documentation = validateDocumentation();
  const apis = validateApis();
  const dashboard = validateDashboard();

  const reproducible = services.all_present
    && services.all_loadable
    && documentation.all_present
    && documentation.phase_count_canonical
    && apis.all_registered
    && apis.all_loadable
    && dashboard.dashboard_ready;

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    reproducible,
    services,
    documentation,
    apis,
    dashboard,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  validateServices,
  validateDocumentation,
  validateApis,
  validateDashboard,
  generateReproducibilityStatus,
  LAYER
};
