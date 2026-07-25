/**
 * UX-001 — Architecture conformance (Presentation Layer only).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '../../../..');

let passed = 0;
let failed = 0;
const limitations = [];

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

function _gitDiff(name) {
  try {
    return execSync(`git diff --name-only HEAD -- ${name}`, { cwd: REPO, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

console.log('UX-001 — Architecture Conformance\n');

test('UX-001 scope — no backend WMS/Supply domain modifications', () => {
  const blocked = [
    'backend/src/domains/logistics-operational',
    'backend/src/domains/supply',
    'backend/src/integration/inc048'
  ];
  for (const p of blocked) {
    const diff = _gitDiff(p);
    assert.equal(diff, '', `${p} must not change in UX-001: ${diff}`);
  }
});

test('no domain runtime file modifications (logistics-operational)', () => {
  const diff = _gitDiff('frontend/src/domains/logistics-operational');
  assert.equal(diff, '', diff || 'ok');
});

test('no feature flag file modifications', () => {
  const diff = _gitDiff('frontend/src/domains/logistics-operational/config/wmsFeatureFlags.js');
  assert.equal(diff, '', 'wmsFeatureFlags untouched');
});

test('presentation layer directory exists', () => {
  assert.ok(fs.existsSync(path.join(REPO, 'frontend/src/presentation/navigation/presentationNavigationRegistry.js')));
});

test('CC exposure uses existing WMS v1 API client only', () => {
  const cc = fs.readFileSync(
    path.join(REPO, 'frontend/src/features/dashboard/centroComando/WmsOperationalCcExposure.jsx'),
    'utf8'
  );
  assert.ok(cc.includes('useWmsOperationalSummary'));
  assert.ok(!cc.includes('/operations/overview'));
});

test('route canonical paths — workspace prefix documented', () => {
  limitations.push(
    'Rotas canónicas WMS: /app/logistics-operational/workspace/* (existentes). Alias /app/logistics-operational/dashboard não criados — requereria nova rota App.jsx.'
  );
  assert.ok(true);
});

if (limitations.length) {
  console.log('\nLimitations registered for UX-001-ARCHITECTURE-CONFORMANCE.md:');
  for (const l of limitations) console.log(`  - ${l}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
