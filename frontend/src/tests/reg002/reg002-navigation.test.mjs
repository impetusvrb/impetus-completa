/**
 * REG-002 — Navigation + Dead Click matrix tests (R6).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  REG_002_CRITICAL_NAV_ITEMS,
  REG_002_DEEP_LINKS,
  REG_002_RESOLVED_DEAD_CLICKS,
  validateDeadClickMatrix
} from '../../platform/audit/regression/reg002DeadClickMatrix.js';

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

console.log('REG-002 — navigation.test\n');

test('dead click matrix integrity', () => {
  const r = validateDeadClickMatrix();
  assert.equal(r.valid, true, r.issues.join('; '));
  assert.equal(r.criticalCount, 4);
});

test('every critical item has page + service + router on disk', () => {
  for (const item of REG_002_CRITICAL_NAV_ITEMS) {
    assert.ok(fs.existsSync(path.join(REPO, item.pageFile.replace(/^frontend\//, 'frontend/')) || path.join(FE, item.pageFile.replace('frontend/', ''))), item.pageFile);
    const pageRel = item.pageFile.replace(/^frontend\//, '');
    assert.ok(fs.existsSync(path.join(FE, pageRel)), item.pageFile);
    assert.ok(fs.existsSync(path.join(REPO, item.service)), item.service);
    assert.ok(fs.existsSync(path.join(REPO, item.backendRouter)), item.backendRouter);
  }
});

test('App.jsx registers all critical menu paths', () => {
  const app = fs.readFileSync(path.join(FE, 'src/App.jsx'), 'utf8');
  for (const item of REG_002_CRITICAL_NAV_ITEMS) {
    assert.ok(app.includes(item.menuPath), item.menuPath);
  }
});

test('resolved dead clicks applied', () => {
  const kpis = fs.readFileSync(path.join(REPO, 'backend/src/services/dashboardKPIs.js'), 'utf8');
  assert.ok(!kpis.includes("route: '/app/industrial'"));
  assert.ok(kpis.includes('/app/centro-operacoes-industrial'));
  assert.ok(REG_002_RESOLVED_DEAD_CLICKS.length >= 3);
  assert.ok(REG_002_DEEP_LINKS.some((d) => d.id === 'cerebro_operacional'));
});

test('CenterWidget has no orphan # for critical center ids', () => {
  const w = fs.readFileSync(path.join(FE, 'src/features/dashboard/widgets/CenterWidget.jsx'), 'utf8');
  for (const id of ['leak_map', 'industrial_map', 'cerebro_operacional', 'insights']) {
    assert.ok(w.includes(`${id}:`), id);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
