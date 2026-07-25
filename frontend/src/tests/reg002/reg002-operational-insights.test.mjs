/**
 * REG-002 — Operational Insights recovery (R4).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

console.log('REG-002 — operational-insights.test\n');

test('InsightsPage and route /app/insights exist', () => {
  assert.ok(fs.existsSync(path.join(FE, 'src/pages/InsightsPage.jsx')));
  const app = fs.readFileSync(path.join(FE, 'src/App.jsx'), 'utf8');
  assert.ok(app.includes('/app/insights'));
});

test('backend GET /insights still mounted', () => {
  const dash = fs.readFileSync(path.join(REPO, 'backend/src/routes/dashboard.js'), 'utf8');
  assert.ok(dash.includes("'/insights'"));
});

test('CenterWidget maps insights deep-link', () => {
  const w = fs.readFileSync(path.join(FE, 'src/features/dashboard/widgets/CenterWidget.jsx'), 'utf8');
  assert.ok(w.includes('insights:'));
  assert.ok(w.includes('/app/insights'));
});

test('guard policy covers insights path', () => {
  const pol = fs.readFileSync(path.join(FE, 'src/utils/industrialCoreAccess.js'), 'utf8');
  assert.ok(pol.includes('/app/insights'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
