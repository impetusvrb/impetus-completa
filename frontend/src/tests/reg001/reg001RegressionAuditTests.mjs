/**
 * REG-001 — Matrix + navigation + connectivity tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  REG_001_PRINCIPLE,
  REG_FUNCTIONAL_RECOVERY_MATRIX,
  listRegressions,
  getFeatureAudit,
  validateRecoveryMatrix,
  REG_NAVIGATION_AUDIT,
  listBrokenNavigation,
  REG_CONNECTIVITY_MATRIX,
  listBrokenChains,
  REG_ORPHAN_API_CLIENTS,
  validateReg001Integrity,
  getRecoveryPlan,
  REG_RECOVERY_ORDER
} from '../../platform/audit/regression/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const REPO = path.join(__dirname, '../../../..');

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

console.log('REG-001 — regression audit tests\n');

test('REACTIVATE BEFORE REWRITE principle', () => {
  assert.equal(REG_001_PRINCIPLE, 'REACTIVATE BEFORE REWRITE');
});

test('recovery matrix includes four known suspects', () => {
  for (const id of ['mapa_vazamentos', 'mapa_industrial', 'operational_insights', 'cerebro_operacional']) {
    assert.ok(getFeatureAudit(id), id);
  }
});

test('mapa vazamentos and industrial were critical regressions — remounted by REG-002', () => {
  const leak = getFeatureAudit('mapa_vazamentos');
  const ind = getFeatureAudit('mapa_industrial');
  // REG-001 matrix preserves discovery (backendMount: false = estado auditado pré-REG-002)
  assert.equal(leak.rootCause, 'route_not_mounted');
  assert.equal(ind.rootCause, 'route_not_mounted');
  assert.equal(leak.service, true);
  assert.equal(ind.service, true);
  // Live wiring restored
  const dash = fs.readFileSync(path.join(REPO, 'backend/src/routes/dashboard.js'), 'utf8');
  assert.ok(dash.includes('financial-leakage'));
  assert.ok(dash.includes('dashboardIndustrial') || dash.includes("'/industrial'"));
});

test('insights and cerebro have backend mount but guard risk', () => {
  assert.equal(getFeatureAudit('operational_insights').backendMount, true);
  assert.equal(getFeatureAudit('cerebro_operacional').backendMount, true);
  assert.equal(getFeatureAudit('operational_insights').rootCause, 'rbac_guard_mismatch');
});

test('recovery matrix integrity', () => {
  const r = validateRecoveryMatrix();
  assert.equal(r.valid, true, r.issues.join('; '));
  assert.ok(listRegressions().length >= 4);
});

test('services exist on disk for critical gaps', () => {
  assert.ok(fs.existsSync(path.join(REPO, 'backend/src/services/financialLeakageDetectorService.js')));
  assert.ok(fs.existsSync(path.join(REPO, 'backend/src/services/industrialOperationalMapService.js')));
});

test('financial-leakage and industrial routes remounted by REG-002', () => {
  const dash = fs.readFileSync(path.join(REPO, 'backend/src/routes/dashboard.js'), 'utf8');
  // REG-001 discovered absence; REG-002 remounted — certify recovery wiring
  assert.ok(dash.includes('financial-leakage'), 'REG-002 R1 must mount financial-leakage');
  assert.ok(dash.includes("'/industrial'") || dash.includes('dashboardIndustrial'), 'REG-002 R2 must mount industrial');
  assert.ok(dash.includes('operational-brain'));
});

test('navigation audit has broken entries', () => {
  assert.ok(REG_NAVIGATION_AUDIT.length >= 6);
  assert.ok(listBrokenNavigation().length >= 4);
});

test('connectivity chains break at documented layers', () => {
  assert.ok(listBrokenChains().length >= 4);
  const leak = REG_CONNECTIVITY_MATRIX.find((c) => c.feature === 'Mapa Vazamento');
  assert.ok(leak.chain.some((l) => l.ok === false));
});

test('orphan API clients documented', () => {
  assert.ok(REG_ORPHAN_API_CLIENTS.length >= 5);
  assert.ok(REG_ORPHAN_API_CLIENTS.some((o) => o.client.includes('financialLeakage')));
});

test('recovery plan R1-R3 priority 1', () => {
  const plan = getRecoveryPlan();
  assert.ok(plan.filter((p) => p.priority === 1).length >= 3);
  assert.ok(REG_RECOVERY_ORDER.length === 5);
});

test('REG-001 integrity validation', () => {
  const r = validateReg001Integrity();
  assert.equal(r.valid, true, (r.issues || []).join('; '));
});

test('evidence documents exist', () => {
  const docs = [
    'REG-001-NAVIGATION-AUDIT.md',
    'REG-001-ROUTE-AUDIT.md',
    'REG-001-REGISTRY-AUDIT.md',
    'REG-001-CONNECTIVITY-MATRIX.md',
    'REG-001-ROOT-CAUSE.md',
    'REG-001-RECOVERY-PLAN.md',
    'REG-001-EXECUTIVE-SUMMARY.md'
  ];
  for (const d of docs) {
    assert.ok(fs.existsSync(path.join(FE, 'docs/audits/regression', d)), d);
  }
});

test('App.jsx and Layout.jsx share industrialCoreAccess policy (REG-002 R3)', () => {
  const app = fs.readFileSync(path.join(FE, 'src/App.jsx'), 'utf8');
  const layout = fs.readFileSync(path.join(FE, 'src/components/Layout.jsx'), 'utf8');
  // REG-001 documented divergence; REG-002 unified via industrialCoreAccess.js
  assert.ok(app.includes('industrialCoreAccess'));
  assert.ok(layout.includes('industrialCoreAccess'));
  const policy = fs.readFileSync(path.join(FE, 'src/utils/industrialCoreAccess.js'), 'utf8');
  assert.ok(policy.includes('director_industrial'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
