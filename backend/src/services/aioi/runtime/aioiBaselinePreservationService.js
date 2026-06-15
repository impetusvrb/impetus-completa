'use strict';

/**
 * AIOI-P1P.2 — Baseline Preservation Monitoring
 * READ ONLY · detecta remoções em serviços, docs, APIs, dashboard.
 */

const fs = require('fs');
const path = require('path');
const {
  ENTERPRISE_BASELINE_PHASES,
  ENTERPRISE_BASELINE_PHASE_COUNT,
  ENTERPRISE_BASELINE_RANGE
} = require('./aioiEnterprisePhaseChain');

const LAYER = 'AIOI_BASELINE_PRESERVATION';
const RUNTIME_DIR = path.join(__dirname);
const DOCS_DIR = path.join(__dirname, '../../../../docs');
const ROUTES_DIR = path.join(__dirname, '../../../routes/aioi');
const WIDGET_PATH = path.join(__dirname, '../../../../../frontend/src/features/dashboard/centroComando/WidgetAIOIScale.jsx');

const PRESERVATION_SERVICES = Object.freeze([
  'aioiEnterprisePhaseChain.js',
  'aioiBaselineRegistryService.js',
  'aioiReleaseManifestService.js',
  'aioiBaselineFreezeService.js',
  'aioiBaselineReproducibilityService.js',
  'aioiBaselineAssuranceService.js',
  'aioiBaselinePreservationService.js',
  'aioiBaselineConsistencyService.js',
  'aioiBaselineTraceabilityService.js',
  'aioiComplianceGovernanceService.js',
  'aioiOperationalIntegrityService.js'
]);

const PRESERVATION_ROUTES = Object.freeze([
  'aioiComplianceRoutes.js',
  'aioiBaselineRoutes.js',
  'aioiAssuranceRoutes.js'
]);

function detectRemovedServices() {
  const missing = [];
  for (const file of PRESERVATION_SERVICES) {
    if (!fs.existsSync(path.join(RUNTIME_DIR, file))) missing.push(file);
  }
  return { missing, all_present: missing.length === 0 };
}

function detectRemovedDocumentation() {
  const missing = [];
  for (const phase of ENTERPRISE_BASELINE_PHASES) {
    if (!fs.existsSync(path.join(DOCS_DIR, phase.doc))) {
      missing.push({ phase: phase.id, doc: phase.doc });
    }
  }
  return {
    missing,
    all_present: missing.length === 0,
    phases_total: ENTERPRISE_BASELINE_PHASES.length,
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT
  };
}

function detectMissingApis() {
  const missing = [];
  for (const file of PRESERVATION_ROUTES) {
    if (!fs.existsSync(path.join(ROUTES_DIR, file))) missing.push(file);
  }
  const broken = [];
  for (const file of PRESERVATION_ROUTES) {
    try {
      require(path.join(ROUTES_DIR, file.replace('.js', '')));
    } catch (err) {
      broken.push({ file, error: err.message });
    }
  }
  return {
    missing,
    all_present: missing.length === 0,
    all_loadable: broken.length === 0,
    broken
  };
}

function detectMissingDashboard() {
  const exists = fs.existsSync(WIDGET_PATH);
  let hasSections = false;
  if (exists) {
    const content = fs.readFileSync(WIDGET_PATH, 'utf8');
    hasSections = /P1N|P1O|P1P|P1Q|P1R|getReleaseStatus/.test(content);
  }
  return {
    widget_present: exists,
    sections_present: hasSections,
    dashboard_ready: exists && hasSections
  };
}

function generatePreservationStatus() {
  const services = detectRemovedServices();
  const documentation = detectRemovedDocumentation();
  const apis = detectMissingApis();
  const dashboard = detectMissingDashboard();

  const violations = [];
  if (!services.all_present) violations.push({ type: 'services', count: services.missing.length });
  if (!documentation.all_present) violations.push({ type: 'documentation', count: documentation.missing.length });
  if (!apis.all_present || !apis.all_loadable) violations.push({ type: 'apis', count: apis.missing.length + apis.broken.length });
  if (!dashboard.dashboard_ready) violations.push({ type: 'dashboard', count: 1 });

  const preservationViolations = violations.reduce((sum, v) => sum + v.count, 0);

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    baseline_preserved: preservationViolations === 0,
    preservation_violations: preservationViolations,
    violations,
    services,
    documentation,
    apis,
    dashboard,
    baseline_range: ENTERPRISE_BASELINE_RANGE,
    expected_phases_total: ENTERPRISE_BASELINE_PHASE_COUNT,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  detectRemovedServices,
  detectRemovedDocumentation,
  detectMissingApis,
  detectMissingDashboard,
  generatePreservationStatus,
  PRESERVATION_SERVICES,
  PRESERVATION_ROUTES,
  LAYER
};
