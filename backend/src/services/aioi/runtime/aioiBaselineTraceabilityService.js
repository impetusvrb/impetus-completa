'use strict';

/**
 * AIOI-P1P.5 — Baseline Traceability Service
 * READ ONLY · rastreabilidade docs, serviços, APIs, dashboards.
 */

const fs = require('fs');
const path = require('path');
const {
  ENTERPRISE_BASELINE_PHASES,
  ENTERPRISE_BASELINE_PHASE_COUNT,
  ENTERPRISE_BASELINE_RANGE
} = require('./aioiEnterprisePhaseChain');

const LAYER = 'AIOI_BASELINE_TRACEABILITY';
const RUNTIME_DIR = path.join(__dirname);
const DOCS_DIR = path.join(__dirname, '../../../../docs');
const ROUTES_DIR = path.join(__dirname, '../../../routes/aioi');
const WIDGET_PATH = path.join(__dirname, '../../../../../frontend/src/features/dashboard/centroComando/WidgetAIOIScale.jsx');

const TRACEABILITY_ROUTES = Object.freeze([
  { file: 'aioiScaleRoutes.js', prefix: '/api/aioi/scale' },
  { file: 'aioiProductionRoutes.js', prefix: '/api/aioi/production' },
  { file: 'aioiOperationsRoutes.js', prefix: '/api/aioi/operations' },
  { file: 'aioiAuthorizationRoutes.js', prefix: '/api/aioi/authorization' },
  { file: 'aioiComplianceRoutes.js', prefix: '/api/aioi/compliance' },
  { file: 'aioiBaselineRoutes.js', prefix: '/api/aioi/baseline' },
  { file: 'aioiAssuranceRoutes.js', prefix: '/api/aioi/assurance' },
  { file: 'aioiRecoveryRoutes.js', prefix: '/api/aioi/recovery' },
  { file: 'aioiReleaseRoutes.js', prefix: '/api/aioi/release' },
  { file: 'aioiArchiveRoutes.js', prefix: '/api/aioi/archive' }
]);

function traceDocumentation() {
  return ENTERPRISE_BASELINE_PHASES.map(p => ({
    phase: p.id,
    doc: p.doc,
    path: path.join(DOCS_DIR, p.doc),
    present: fs.existsSync(path.join(DOCS_DIR, p.doc)),
    dependencies: p.deps,
    verdict: p.verdict
  }));
}

function traceServices() {
  const services = require('./aioiBaselinePreservationService').PRESERVATION_SERVICES;
  return services.map(file => ({
    file,
    path: path.join(RUNTIME_DIR, file),
    present: fs.existsSync(path.join(RUNTIME_DIR, file))
  }));
}

function traceApis() {
  return TRACEABILITY_ROUTES.map(r => ({
    ...r,
    path: path.join(ROUTES_DIR, r.file),
    present: fs.existsSync(path.join(ROUTES_DIR, r.file))
  }));
}

function traceDashboard() {
  const exists = fs.existsSync(WIDGET_PATH);
  return {
    widget: 'WidgetAIOIScale.jsx',
    path: WIDGET_PATH,
    present: exists,
    p1n: exists && /P1N/.test(fs.readFileSync(WIDGET_PATH, 'utf8')),
    p1o: exists && /P1O/.test(fs.readFileSync(WIDGET_PATH, 'utf8')),
    p1p: exists && /P1P/.test(fs.readFileSync(WIDGET_PATH, 'utf8')),
    p1q: exists && /P1Q|getRecoveryStatus/.test(fs.readFileSync(WIDGET_PATH, 'utf8')),
    p1r: exists && /P1R|getReleaseStatus/.test(fs.readFileSync(WIDGET_PATH, 'utf8')),
    p1s: exists && /P1S|getClosureStatus/.test(fs.readFileSync(WIDGET_PATH, 'utf8'))
  };
}

function generateTraceabilityStatus() {
  const docs = traceDocumentation();
  const services = traceServices();
  const apis = traceApis();
  const dashboard = traceDashboard();

  const traceabilityComplete = docs.every(d => d.present)
    && docs.length === ENTERPRISE_BASELINE_PHASE_COUNT
    && services.every(s => s.present)
    && apis.every(a => a.present)
    && dashboard.present
    && dashboard.p1n
    && dashboard.p1o
    && dashboard.p1p
    && dashboard.p1q
    && dashboard.p1r
    && dashboard.p1s;

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    traceability_complete: traceabilityComplete,
    documentation: { entries: docs, total: docs.length, expected: ENTERPRISE_BASELINE_PHASE_COUNT },
    services: { entries: services, total: services.length },
    apis: { entries: apis, total: apis.length },
    dashboard,
    baseline_range: ENTERPRISE_BASELINE_RANGE,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  traceDocumentation,
  traceServices,
  traceApis,
  traceDashboard,
  generateTraceabilityStatus,
  LAYER,
  TRACEABILITY_ROUTES
};
