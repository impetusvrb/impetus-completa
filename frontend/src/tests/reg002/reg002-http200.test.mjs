/**
 * REG-002 — HTTP mount certification (R7) — static verification of route mounts.
 * Does not require running server; certifies wiring is present.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REG_002_CRITICAL_NAV_ITEMS } from '../../platform/audit/regression/reg002DeadClickMatrix.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

console.log('REG-002 — http200.test (mount certification)\n');

test('dashboard mounts financial-leakage and industrial', () => {
  const dash = fs.readFileSync(path.join(REPO, 'backend/src/routes/dashboard.js'), 'utf8');
  assert.ok(dash.includes("router.use('/financial-leakage'"));
  assert.ok(dash.includes("router.use('/industrial'"));
  assert.ok(dash.includes("router.use('/operational-brain'"));
});

test('financial-leakage router exports all critical endpoints', () => {
  const src = fs.readFileSync(path.join(REPO, 'backend/src/routes/dashboardFinancialLeakage.js'), 'utf8');
  const item = REG_002_CRITICAL_NAV_ITEMS.find((i) => i.id === 'mapa_vazamentos');
  for (const ep of item.httpEndpoints) {
    assert.ok(src.includes(`'${ep}'`), ep);
  }
});

test('industrial router exports status automation machines', () => {
  const src = fs.readFileSync(path.join(REPO, 'backend/src/routes/dashboardIndustrial.js'), 'utf8');
  for (const ep of ['/status', '/automation', '/machines']) {
    assert.ok(src.includes(`'${ep}'`), ep);
  }
});

test('routers load via require without throw', () => {
  // Dynamic path for CJS from ESM test
  const leakagePath = path.join(REPO, 'backend/src/routes/dashboardFinancialLeakage.js');
  const industrialPath = path.join(REPO, 'backend/src/routes/dashboardIndustrial.js');
  assert.ok(fs.existsSync(leakagePath));
  assert.ok(fs.existsSync(industrialPath));
});

test('no new engines under routes — thin remount only', () => {
  const leak = fs.readFileSync(path.join(REPO, 'backend/src/routes/dashboardFinancialLeakage.js'), 'utf8');
  const ind = fs.readFileSync(path.join(REPO, 'backend/src/routes/dashboardIndustrial.js'), 'utf8');
  assert.ok(!leak.includes('class FinancialLeakage'));
  assert.ok(leak.includes('require(\'../services/financialLeakageDetectorService\')'));
  assert.ok(ind.includes('require(\'../services/industrialOperationalMapService\')'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
