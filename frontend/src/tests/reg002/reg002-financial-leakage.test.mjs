/**
 * REG-002 — Financial Leakage Recovery tests (R1).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '../../../..');
const FE = path.join(__dirname, '../../..');

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

console.log('REG-002 — financial-leakage.test\n');

test('router file exists and mounts five endpoints', () => {
  const src = fs.readFileSync(path.join(REPO, 'backend/src/routes/dashboardFinancialLeakage.js'), 'utf8');
  for (const ep of ['/map', '/ranking', '/alerts', '/report', '/projected-impact']) {
    assert.ok(src.includes(`'${ep}'`) || src.includes(`"${ep}"`), ep);
  }
  assert.ok(src.includes('financialLeakageDetectorService'));
  assert.ok(!src.includes('detectAndAggregate =')); // no reimplementation
});

test('dashboard.js mounts financial-leakage router', () => {
  const dash = fs.readFileSync(path.join(REPO, 'backend/src/routes/dashboard.js'), 'utf8');
  assert.ok(dash.includes("'/financial-leakage'"));
  assert.ok(dash.includes('dashboardFinancialLeakage'));
});

test('service unchanged — exports intact', () => {
  const svc = fs.readFileSync(path.join(REPO, 'backend/src/services/financialLeakageDetectorService.js'), 'utf8');
  assert.ok(svc.includes('getLeakMap'));
  assert.ok(svc.includes('getLeakRanking'));
  assert.ok(svc.includes('getProjectedImpact'));
});

test('api.js client paths match mounted routes', () => {
  const api = fs.readFileSync(path.join(FE, 'src/services/api.js'), 'utf8');
  assert.ok(api.includes('/dashboard/financial-leakage/map'));
  assert.ok(api.includes('/dashboard/financial-leakage/ranking'));
});

test('UI page still uses financialLeakage client only', () => {
  const page = fs.readFileSync(path.join(FE, 'src/pages/MapaVazamentoFinanceiro.jsx'), 'utf8');
  assert.ok(page.includes('dashboard.financialLeakage.getMap'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
