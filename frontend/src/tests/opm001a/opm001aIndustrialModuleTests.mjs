/**
 * OPM-001A — Industrial Operational Module Standard (presentation layer).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODULE_STATES, TOOLBAR_ACTIONS, INDUSTRIAL_MODULE_PHASE } from '../../presentation/industrial-module/industrialModuleTokens.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const IM = path.join(FE, 'src/presentation/industrial-module');

const REQUIRED_COMPONENTS = [
  'IndustrialModuleLayout.jsx',
  'IndustrialModuleHeader.jsx',
  'IndustrialKpiPanel.jsx',
  'IndustrialToolbar.jsx',
  'IndustrialSearchBar.jsx',
  'IndustrialFilterBar.jsx',
  'IndustrialDataGrid.jsx',
  'IndustrialDetailsPanel.jsx',
  'IndustrialTimeline.jsx',
  'IndustrialAlertPanel.jsx',
  'IndustrialInsightPanel.jsx',
  'IndustrialActionBar.jsx',
  'IndustrialOperationalModule.jsx',
  'IndustrialModuleStates.jsx',
  'industrialModuleTokens.js',
  'industrial-module.css',
  'index.js'
];

const REQUIRED_STATES = [
  'loading',
  'empty',
  'error',
  'permission_denied',
  'offline',
  'read_only',
  'syncing',
  'updating',
  'partial_data',
  'integration_unavailable',
  'data_loaded'
];

const WMS_MODULE_PAGES = [
  'WarehouseModulePage',
  'InventoryModulePage',
  'ReceivingModulePage',
  'PickingModulePage',
  'ShippingModulePage',
  'TransferModulePage'
];

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
  return fs.readFileSync(path.join(FE, 'src', rel), 'utf8');
}

console.log('OPM-001A — Industrial Module Framework Tests\n');

test('framework directory contains all canonical components', () => {
  for (const f of REQUIRED_COMPONENTS) {
    assert.ok(fs.existsSync(path.join(IM, f)), `missing ${f}`);
  }
});

test('MODULE_STATES covers mandatory operational states', () => {
  for (const s of REQUIRED_STATES) {
    assert.ok(MODULE_STATES[s], `missing state ${s}`);
  }
});

test('TOOLBAR_ACTIONS defines standard toolbar slots', () => {
  for (const k of ['search', 'refresh', 'export', 'filters', 'columns', 'help']) {
    assert.ok(TOOLBAR_ACTIONS[k], `missing toolbar action ${k}`);
  }
});

test('IndustrialModuleLayout composes full stack', () => {
  const layout = fs.readFileSync(path.join(IM, 'IndustrialModuleLayout.jsx'), 'utf8');
  assert.ok(layout.includes('IndustrialModuleHeader'));
  assert.ok(layout.includes('IndustrialKpiPanel'));
  assert.ok(layout.includes('IndustrialToolbar'));
  assert.ok(layout.includes('IndustrialSearchBar'));
  assert.ok(layout.includes('IndustrialFilterBar'));
  assert.ok(layout.includes('IndustrialTimeline'));
  assert.ok(layout.includes('IndustrialAlertPanel'));
  assert.ok(layout.includes('IndustrialInsightPanel'));
  assert.ok(layout.includes('IndustrialActionBar'));
  assert.ok(layout.includes('data-industrial-module'));
});

test('IndustrialOperationalModule uses layout without domain CRUD', () => {
  const mod = fs.readFileSync(path.join(IM, 'IndustrialOperationalModule.jsx'), 'utf8');
  assert.ok(mod.includes('IndustrialModuleLayout'));
  assert.ok(mod.includes('IndustrialDataGrid'));
  assert.ok(!mod.includes('createWarehouse'));
  assert.ok(!mod.includes('POST'));
});

test('cognitive panels are placeholder-only', () => {
  const alert = fs.readFileSync(path.join(IM, 'IndustrialAlertPanel.jsx'), 'utf8');
  const insight = fs.readFileSync(path.join(IM, 'IndustrialInsightPanel.jsx'), 'utf8');
  assert.ok(alert.includes('data-industrial-cognitive'));
  assert.ok(insight.includes('data-industrial-cognitive'));
  assert.ok(!alert.includes('claudePanel'));
  assert.ok(!insight.includes('smartPanel'));
});

test('WmsStandaloneModuleFrame delegates to industrial framework', () => {
  const frame = read('domains/logistics-operational/components/WmsStandaloneModuleFrame.jsx');
  assert.ok(frame.includes('IndustrialOperationalModule'));
  assert.ok(frame.includes('data-wms-standalone="true"'));
  assert.ok(frame.includes('canAccessWmsModule'));
  assert.ok(frame.includes('screen-header'));
});

test('index.js exports public API', () => {
  const idx = fs.readFileSync(path.join(IM, 'index.js'), 'utf8');
  assert.ok(idx.includes('IndustrialModuleLayout'));
  assert.ok(idx.includes('IndustrialOperationalModule'));
  assert.ok(idx.includes('MODULE_STATES'));
});

test('phase token is OPM-001A', () => {
  assert.equal(INDUSTRIAL_MODULE_PHASE, 'OPM-001A');
});

for (const page of WMS_MODULE_PAGES) {
  test(`${page} uses WMS standalone presentation`, () => {
    const c = read(`domains/logistics-operational/pages/standalone/${page}.jsx`);
    if (page === 'WarehouseModulePage') {
      assert.ok(c.includes('WarehouseOperationalModule'));
    } else if (page === 'InventoryModulePage') {
      assert.ok(c.includes('InventoryOperationalModule'));
    } else {
      assert.ok(c.includes('WmsStandaloneModuleFrame'));
    }
  });
}

test('no backend changes in OPM-001A scope', () => {
  const backendSrc = path.join(FE, '../backend/src');
  assert.ok(fs.existsSync(backendSrc));
  const server = fs.readFileSync(path.join(backendSrc, 'server.js'), 'utf8');
  assert.ok(!server.includes('OPM-001A'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
