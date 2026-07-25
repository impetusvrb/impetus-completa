/**
 * OPM-001D — Operational Baseline Certification tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  OPM001D_PHASE,
  EOX_BASELINE_SCOPE,
  UX002_POLISH_BACKLOG,
  LOGISTICS_WMS_BASELINE,
  QUALITY_BASELINE,
  ENVIRONMENT_BASELINE,
  SAFETY_BASELINE,
  EOX_ADAPTERS_BASELINE,
  isOperationalBaselineFullyCertified
} from '../../certification/opm001dOperationalBaselineRegistry.js';
import { resolveLogisticsOperationalNavigation } from '../../presentation/eox/eoxRegistry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const SRC = path.join(FE, 'src');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

function read(rel) {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(SRC, rel));
}

console.log('OPM-001D — Operational Baseline Certification Tests\n');

test('certification phase is OPM-001D', () => {
  assert.equal(OPM001D_PHASE, 'OPM-001D');
});

test('operational baseline registry fully certified', () => {
  assert.equal(isOperationalBaselineFullyCertified(), true);
});

test('EOX baseline scope defined — shell only, not layout substitute', () => {
  assert.ok(EOX_BASELINE_SCOPE.includes('corporate_header'));
  assert.ok(EOX_BASELINE_SCOPE.includes('outlet_context_forward'));
  const shell = read('presentation/eox/EoxModuleShell.jsx');
  assert.ok(!shell.includes('QualityGovernanceHub'));
  assert.ok(!shell.includes('WasteOperationalHub'));
  assert.ok(!shell.includes('IndustrialModuleLayout'));
});

test('Logistics WMS — all six modules certified with presentation stack', () => {
  assert.equal(LOGISTICS_WMS_BASELINE.modules.length, 8);
  for (const mod of LOGISTICS_WMS_BASELINE.modules) {
    assert.equal(mod.certified, true, mod.id);
    assert.ok(exists(mod.page), mod.page);
    assert.ok(exists(mod.presentation), mod.presentation);
    const src = read(mod.presentation);
    for (const token of mod.stack) {
      assert.ok(src.includes(token), `${mod.id}: ${token}`);
    }
  }
});

test('Logistics WMS — IndustrialOperationalModule provides OPM-001A stack', () => {
  const iom = read('presentation/industrial-module/IndustrialOperationalModule.jsx');
  assert.ok(iom.includes('IndustrialModuleLayout'));
  assert.ok(iom.includes('IndustrialDataGrid'));
  assert.ok(iom.includes('TOOLBAR_ACTIONS'));
});

test('Logistics WMS — warehouse OPM-001C foundation preserved', () => {
  const wh = read('domains/logistics-operational/modules/warehouse/WarehouseOperationalModule.jsx');
  assert.ok(wh.includes('IndustrialModuleLayout'));
  assert.ok(wh.includes('WarehouseDetailsPanel'));
  assert.ok(wh.includes('buildWarehouseOperationalTimeline'));
  assert.ok(wh.includes('const PHASE = \'OPM-001C\''));
});

test('Logistics WMS — EOX breadcrumb for warehouses module', () => {
  const cfg = resolveLogisticsOperationalNavigation('/app/logistics/warehouses');
  assert.equal(cfg.module, 'Armazéns');
  assert.equal(cfg.phase, 'OPM-001C');
  assert.ok(cfg.breadcrumb.some((b) => b.label === 'IMPETUS'));
});

test('Quality — operational modules composition preserved', () => {
  for (const mod of QUALITY_BASELINE.modules) {
    assert.equal(mod.certified, true, mod.id);
    assert.ok(exists(mod.component), mod.component);
    const src = read(mod.component);
    for (const marker of mod.markers) {
      assert.ok(src.includes(marker), `${mod.id}: ${marker}`);
    }
  }
  const ws = read('domains/quality/operational-runtime/QualityOperationalWorkspace.jsx');
  assert.ok(ws.includes('QualityGovernanceHub'));
  assert.ok(ws.includes('QualityInspectionRuntime'));
  assert.ok(ws.includes('useOutletContext'));
});

test('Environment — waste water emissions compliance preserved', () => {
  for (const mod of ENVIRONMENT_BASELINE.modules) {
    assert.equal(mod.certified, true, mod.id);
    assert.ok(exists(mod.component), mod.component);
    const src = read(mod.component);
    for (const marker of mod.markers) {
      assert.ok(src.includes(marker), `${mod.id}: ${marker}`);
    }
  }
  const ws = read('domains/environment/operational-runtime/EnvironmentOperationalWorkspace.jsx');
  assert.ok(ws.includes('EnvironmentOperationalViewRouter'));
  assert.ok(ws.includes('EnvironmentGovernanceViewRouter'));
});

test('Safety — incidents near miss training PTW EPI preserved', () => {
  for (const mod of SAFETY_BASELINE.modules) {
    assert.equal(mod.certified, true, mod.id);
  }
  const incident = read('domains/safety/operational-runtime/SafetyIncidentPanel.jsx');
  assert.ok(incident.includes('near_miss'));
  assert.ok(incident.includes('training_expired'));
  assert.ok(incident.includes('KpiCard'));

  const ws = read('domains/safety/operational-runtime/SafetyOperationalWorkspace.jsx');
  assert.ok(ws.includes("view === 'incident'"));
  assert.ok(ws.includes("view === 'governance' || view === 'ptw' || view === 'epi'"));
  assert.ok(ws.includes('SafetyIncidentPanel'));
  assert.ok(ws.includes('SafetyGovernanceHub'));
});

test('all EOX adapters certified with context forward pattern', () => {
  for (const adapter of EOX_ADAPTERS_BASELINE) {
    assert.equal(adapter.certified, true, adapter.id);
    assert.ok(exists(adapter.path), adapter.path);
  }
  const canonical = read('presentation/eox/EoxDomainNavLayout.jsx');
  assert.ok(canonical.includes('useOutletContext'));
  assert.ok(canonical.includes('<Outlet context={parentCtx}'));

  for (const rel of [
    'domains/quality/layout/QualityOperationalNavLayout.jsx',
    'domains/safety/layout/SafetyOperationalNavLayout.jsx',
    'domains/environment/layout/EnvironmentOperationalNavLayout.jsx',
    'domains/logistics/layout/LogisticsOperationalNavLayout.jsx'
  ]) {
    const src = read(rel);
    assert.ok(src.includes('EoxDomainNavLayout'), rel);
  }

  const wms = read('domains/logistics-operational/layout/WmsOperationalNavLayout.jsx');
  assert.ok(wms.includes('<Outlet context={parentCtx}'));
});

test('Safety PTW/EPI route to governance hub not placeholder', () => {
  const ws = read('domains/safety/operational-runtime/SafetyOperationalWorkspace.jsx');
  assert.ok(ws.includes("view === 'governance' || view === 'ptw' || view === 'epi'"));
  assert.ok(ws.includes('SafetyGovernanceHub'));
});

test('Quality shell preserves status bar outside EOX', () => {
  const shell = read('domains/quality/operational-runtime/QualityOperationalShell.jsx');
  assert.ok(shell.includes('QualityRealtimeStatusBar'));
  const idx = shell.indexOf('QualityRealtimeStatusBar');
  const outlet = shell.indexOf('<Outlet');
  assert.ok(idx < outlet);
});

test('UX-002 polish backlog registered (non-blocking)', () => {
  assert.ok(UX002_POLISH_BACKLOG.length >= 5);
  const doc = path.join(FE, 'docs/evidence/UX-002-ENTERPRISE-PRESENTATION-POLISH.md');
  assert.ok(fs.existsSync(doc), 'UX-002 evidence doc');
});

test('environment workspace remount on view change', () => {
  const page = read('domains/environment/routes/EnvironmentOperationalWorkspacePage.jsx');
  assert.ok(page.includes('useLocation'));
  assert.ok(page.includes('key={routeKey}') || page.includes('key={`'));
});

test('certification evidence documents exist', () => {
  for (const doc of [
    'OPM-001D-OPERATIONAL-BASELINE-CERTIFICATION.md',
    'OPM-001D-DOMAIN-CHECKLIST.md',
    'OPM-001D-COMPATIBILITY.md',
    'OPM-001D-TEST-REPORT.md',
    'OPM-001D-EXECUTIVE-SUMMARY.md'
  ]) {
    assert.ok(fs.existsSync(path.join(FE, 'docs/evidence', doc)), doc);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('\nOPM-001D — OPERATIONAL BASELINE CERTIFIED');
  console.log('Platform cleared for OPM-002A — Inventory Foundation');
}
process.exit(failed ? 1 : 0);
