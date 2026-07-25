/**
 * NAV-002A — Navigation UX Refinement tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveLogisticsOperationalNavigation } from '../../presentation/operational-navigation/operationalNavigationRegistry.js';
import { ONX_PHASE } from '../../presentation/operational-navigation/operationalNavigationTokens.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const ONX = path.join(FE, 'src/presentation/operational-navigation');

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

console.log('NAV-002A — Navigation UX Refinement Tests\n');

test('ONX phase is NAV-002A', () => {
  assert.equal(ONX_PHASE, 'NAV-002A');
});

test('back target points to domain landing not legacy workspace', () => {
  const cfg = resolveLogisticsOperationalNavigation('/app/logistics/warehouses');
  assert.equal(cfg.backTarget.path, '/app/logistics/operational');
  assert.ok(!cfg.backTarget.path.includes('logistics-operational/workspace'));
  assert.equal(cfg.backTarget.shortLabel, 'Logística');
});

test('breadcrumb Logística links to domain landing', () => {
  const cfg = resolveLogisticsOperationalNavigation('/app/logistics/inventory');
  const log = cfg.breadcrumb.find((b) => b.label === 'Logística');
  assert.ok(log);
  assert.equal(log.path, '/app/logistics/operational');
});

test('breadcrumb IMPETUS links to dashboard', () => {
  const cfg = resolveLogisticsOperationalNavigation('/app/logistics/warehouses');
  const root = cfg.breadcrumb.find((b) => b.label === 'IMPETUS');
  assert.equal(root.path, '/app');
});

test('CC back target is dashboard principal', () => {
  const cfg = resolveLogisticsOperationalNavigation('/app/logistics/warehouses');
  assert.equal(cfg.ccBackTarget.path, '/app');
});

test('back link is secondary not btn-ghost', () => {
  const header = fs.readFileSync(path.join(FE, 'src/presentation/eox/EoxHeader.jsx'), 'utf8');
  assert.ok(header.includes('onx-back-link--domain'));
  assert.ok(header.includes('onx-top-actions'));
  assert.ok(!header.includes('btn btn-ghost'));
});

test('unified header suppresses industrial module header via context', () => {
  const layout = read('presentation/industrial-module/IndustrialModuleLayout.jsx');
  assert.ok(layout.includes('useOnxNavigation'));
  assert.ok(layout.includes('suppressModuleHeader'));
  const shell = fs.readFileSync(path.join(FE, 'src/presentation/eox/EoxModuleShell.jsx'), 'utf8');
  assert.ok(shell.includes('suppressModuleHeader: true'));
  assert.ok(shell.includes('suppressHubHeader: true'));
});

test('no history.back in ONX', () => {
  const header = fs.readFileSync(path.join(FE, 'src/presentation/eox/EoxHeader.jsx'), 'utf8');
  assert.ok(!header.includes('history.back'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
