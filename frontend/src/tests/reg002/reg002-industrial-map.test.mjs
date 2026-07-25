/**
 * REG-002 — Industrial Map Recovery tests (R2).
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

console.log('REG-002 — industrial-map.test\n');

test('industrial router exists and delegates to industrialOperationalMapService', () => {
  const src = fs.readFileSync(path.join(REPO, 'backend/src/routes/dashboardIndustrial.js'), 'utf8');
  assert.ok(src.includes('industrialOperationalMapService'));
  assert.ok(src.includes("'/status'"));
  assert.ok(src.includes("'/automation'"));
  assert.ok(src.includes("'/machines'"));
  assert.ok(src.includes('getFactoryMap'));
});

test('dashboard.js mounts industrial router', () => {
  const dash = fs.readFileSync(path.join(REPO, 'backend/src/routes/dashboard.js'), 'utf8');
  assert.ok(dash.includes("'/industrial'"));
  assert.ok(dash.includes('dashboardIndustrial'));
});

test('IndustrialOperationsCenter uses getStatus + getAutomation', () => {
  const page = fs.readFileSync(path.join(FE, 'src/pages/IndustrialOperationsCenter.jsx'), 'utf8');
  assert.ok(page.includes('dashboard.industrial.getStatus'));
  assert.ok(page.includes('dashboard.industrial.getAutomation'));
});

test('service file preserved', () => {
  assert.ok(fs.existsSync(path.join(REPO, 'backend/src/services/industrialOperationalMapService.js')));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
