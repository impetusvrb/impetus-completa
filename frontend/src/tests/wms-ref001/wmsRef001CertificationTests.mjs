/**
 * WMS-REF-001 — Reference Components Certification tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  WMS_REF001_CERTIFICATION,
  WMS_REF001_CATALOG,
  WMS_REF001_COMPATIBILITY,
  WMS_REF001_CERTIFIED_COMPONENT_IDS,
  WMS_REF001_CONTRACT_SCHEMA,
  WMS_REF001_COMPONENT_CONTRACTS,
  WMS_REF001_REUSE_MATRIX,
  WMS_REF001_REUSE_POLICY,
  isWmsRef001Certified,
  getWmsRef001CatalogEntry
} from '../../presentation/wms-reference-components/wmsRef001Registry.js';
import {
  assertWmsRef001ContractComplete,
  getWmsRef001Contract
} from '../../presentation/wms-reference-components/wmsRef001ComponentContracts.js';
import { getReuseRequirement } from '../../presentation/wms-reference-components/wmsRef001ReuseMatrix.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const REF = path.join(FE, 'src/presentation/wms-reference-components');
const INV_COMP = path.join(FE, 'src/domains/logistics-operational/modules/inventory/components');

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

console.log('WMS-REF-001 — Reference Components Certification Tests\n');

test('certification registry is marked certified', () => {
  assert.equal(WMS_REF001_CERTIFICATION.id, 'WMS-REF-001');
  assert.equal(WMS_REF001_CERTIFICATION.certified, true);
  assert.equal(WMS_REF001_CERTIFICATION.prerequisite, 'OPM-002A');
  assert.equal(WMS_REF001_CERTIFICATION.nextGate, 'OPM-003');
});

test('catalog lists all seven certified components', () => {
  assert.equal(WMS_REF001_CATALOG.length, 7);
  assert.equal(WMS_REF001_CERTIFIED_COMPONENT_IDS.length, 7);
  for (const id of [
    'InventoryDashboard',
    'InventoryMetrics',
    'InventorySearch',
    'InventoryFilters',
    'InventoryGrid',
    'InventoryTimeline',
    'InventoryExport'
  ]) {
    assert.ok(isWmsRef001Certified(id), id);
    assert.ok(getWmsRef001CatalogEntry(id)?.certified, id);
  }
});

test('every contract has mandatory schema fields', () => {
  for (const componentId of WMS_REF001_CERTIFIED_COMPONENT_IDS) {
    const contract = getWmsRef001Contract(componentId);
    assert.ok(contract, componentId);
    assertWmsRef001ContractComplete(contract);
    assert.equal(contract.componentId, componentId);
  }
  assert.equal(WMS_REF001_CONTRACT_SCHEMA.length, 13);
});

test('implementation files exist and match catalog', () => {
  for (const entry of WMS_REF001_CATALOG) {
    const impl = path.join(INV_COMP, `${entry.componentId}.jsx`);
    assert.ok(fs.existsSync(impl), entry.componentId);
  }
});

test('official import path re-exports certified components', () => {
  const index = fs.readFileSync(path.join(REF, 'index.js'), 'utf8');
  for (const id of WMS_REF001_CERTIFIED_COMPONENT_IDS) {
    assert.ok(index.includes(id), `export ${id}`);
  }
  assert.ok(index.includes('wmsRef001Registry'));
  assert.ok(index.includes('wmsRef001ComponentContracts'));
});

test('reuse matrix covers OPM-003 through OPM-008', () => {
  assert.equal(WMS_REF001_REUSE_MATRIX.length, 6);
  const phases = WMS_REF001_REUSE_MATRIX.map((m) => m.phase);
  assert.ok(phases.includes('OPM-003'));
  assert.ok(phases.includes('OPM-007'));
  assert.ok(phases.includes('OPM-008'));
  for (const mod of WMS_REF001_REUSE_MATRIX) {
    assert.equal(Object.keys(mod.components).length, 7);
    for (const id of WMS_REF001_CERTIFIED_COMPONENT_IDS) {
      const req = getReuseRequirement(mod.moduleId, id);
      assert.equal(req.reuse, 'required', `${mod.moduleId}/${id}`);
    }
  }
});

test('reuse policy mandates official import path', () => {
  assert.equal(WMS_REF001_REUSE_POLICY.mandatory, true);
  assert.equal(WMS_REF001_REUSE_POLICY.officialImportPath, 'presentation/wms-reference-components');
  assert.ok(WMS_REF001_REUSE_POLICY.exceptionProcess.includes('justificativa'));
});

test('compatibility matrix certified for EOX, grid, observability, RBAC', () => {
  assert.equal(WMS_REF001_COMPATIBILITY.eox.status, 'certified');
  assert.equal(WMS_REF001_COMPATIBILITY.industrialDataGrid.status, 'certified');
  assert.equal(WMS_REF001_COMPATIBILITY.wms003Apis.status, 'certified');
  assert.equal(WMS_REF001_COMPATIBILITY.observability.status, 'certified');
  assert.equal(WMS_REF001_COMPATIBILITY.rbac.status, 'certified');
  assert.equal(WMS_REF001_COMPATIBILITY.featureFlags.status, 'certified');
});

test('component behavior signatures unchanged (regression)', () => {
  const signatures = {
    InventoryDashboard: ['kpis = []', 'columns = 4', 'IndustrialKpiPanel'],
    InventoryMetrics: ['intelligence', 'Panel', 'InventoryOperationalIntelligencePanel'],
    InventorySearch: ['IndustrialSearchBar', 'onChange', 'placeholder'],
    InventoryFilters: ['onFilterChange', 'inventory-filter-active'],
    InventoryGrid: ['IndustrialDataGrid', 'onSortChange', 'trackInventoryGridSort', 'enableSortTracking'],
    InventoryTimeline: ['INVENTORY_TIMELINE_PERIODS', 'onPeriodTrack', 'onWarehouseFilterChange'],
    InventoryExport: ['EoxActionBar', 'export_csv', 'export_excel', 'export_pdf']
  };
  for (const [name, tokens] of Object.entries(signatures)) {
    const src = fs.readFileSync(path.join(INV_COMP, `${name}.jsx`), 'utf8');
    for (const t of tokens) assert.ok(src.includes(t), `${name}: ${t}`);
  }
});

test('InventoryOperationalModule may consume official catalog path', () => {
  const mod = fs.readFileSync(
    path.join(FE, 'src/domains/logistics-operational/modules/inventory/InventoryOperationalModule.jsx'),
    'utf8'
  );
  assert.ok(
    mod.includes('presentation/wms-reference-components') || mod.includes('./components/index.js'),
    'import path'
  );
});

test('contracts document events for interactive components', () => {
  assert.ok(WMS_REF001_COMPONENT_CONTRACTS.InventoryGrid.events.some((e) => e.id === 'INVENTORY_GRID_SORT'));
  assert.ok(WMS_REF001_COMPONENT_CONTRACTS.InventoryExport.events.some((e) => e.id === 'INVENTORY_EXPORT'));
  assert.ok(WMS_REF001_COMPONENT_CONTRACTS.InventoryTimeline.events.some((e) => e.id === 'INVENTORY_TIMELINE'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
