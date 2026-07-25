/**
 * REG-002 — Guard unification tests (R3).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canAccessIndustrialCore,
  canAccessIndustrialCoreModules
} from '../../utils/industrialCoreAccess.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

console.log('REG-002 — guards.test\n');

test('CEO always has industrial core access', () => {
  assert.equal(canAccessIndustrialCore({ role: 'ceo' }), true);
});

test('diretor genérico WITHOUT industrial profile denied', () => {
  assert.equal(canAccessIndustrialCore({ role: 'diretor', dashboard_profile: 'finance_management' }), false);
});

test('diretor industrial profile allowed', () => {
  assert.equal(canAccessIndustrialCore({ role: 'diretor', dashboard_profile: 'director_industrial' }), true);
  assert.equal(canAccessIndustrialCore({ role: 'diretor', functional_area: 'operations' }), true);
});

test('menu requires operational module AND core access', () => {
  const user = { role: 'diretor', dashboard_profile: 'director_industrial' };
  assert.equal(canAccessIndustrialCoreModules(user, ['operational']), true);
  assert.equal(canAccessIndustrialCoreModules(user, []), false);
  assert.equal(canAccessIndustrialCoreModules({ role: 'diretor' }, ['operational']), false);
});

test('App.jsx and Layout.jsx import shared policy', () => {
  const app = fs.readFileSync(path.join(FE, 'src/App.jsx'), 'utf8');
  const layout = fs.readFileSync(path.join(FE, 'src/components/Layout.jsx'), 'utf8');
  assert.ok(app.includes('industrialCoreAccess'));
  assert.ok(layout.includes('industrialCoreAccess'));
  assert.ok(!layout.includes("(role === 'ceo' || role === 'diretor')"));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
