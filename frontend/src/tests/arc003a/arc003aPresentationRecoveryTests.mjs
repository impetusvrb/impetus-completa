/**
 * ARC-003A — Enterprise Presentation Regression Recovery tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const EOX = path.join(FE, 'src/presentation/eox');

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

console.log('ARC-003A — Presentation Regression Recovery Tests\n');

test('EoxDomainNavLayout exists and forwards Outlet context', () => {
  const adapter = fs.readFileSync(path.join(EOX, 'EoxDomainNavLayout.jsx'), 'utf8');
  assert.ok(adapter.includes('useOutletContext'));
  assert.ok(adapter.includes('<Outlet context={parentCtx}'));
  assert.ok(adapter.includes('EoxModuleShell'));
  assert.ok(adapter.includes('Enterprise Shell'));
});

test('all domain nav layouts use EoxDomainNavLayout adapter', () => {
  for (const rel of [
    'domains/quality/layout/QualityOperationalNavLayout.jsx',
    'domains/safety/layout/SafetyOperationalNavLayout.jsx',
    'domains/environment/layout/EnvironmentOperationalNavLayout.jsx',
    'domains/logistics/layout/LogisticsOperationalNavLayout.jsx'
  ]) {
    const src = read(rel);
    assert.ok(src.includes('EoxDomainNavLayout'), rel);
    assert.ok(!src.includes('<EoxModuleShell'), `${rel} must not embed shell directly`);
  }
});

test('WMS nav layout forwards outlet context', () => {
  const wms = read('domains/logistics-operational/layout/WmsOperationalNavLayout.jsx');
  assert.ok(wms.includes('useOutletContext'));
  assert.ok(wms.includes('<Outlet context={parentCtx}'));
});

test('domain workspaces still mount original composition roots', () => {
  const quality = read('domains/quality/operational-runtime/QualityOperationalWorkspace.jsx');
  assert.ok(quality.includes('QualityGovernanceHub'));
  assert.ok(quality.includes('QualityTelemetryHub'));
  assert.ok(quality.includes('QualityOperationalHub'));
  assert.ok(quality.includes('useOutletContext'));

  const safety = read('domains/safety/operational-runtime/SafetyOperationalWorkspace.jsx');
  assert.ok(safety.includes('SafetyGovernanceHub'));
  assert.ok(safety.includes('SafetyTelemetryHub'));
  assert.ok(safety.includes('SafetyIncidentPanel'));

  const env = read('domains/environment/operational-runtime/EnvironmentOperationalWorkspace.jsx');
  assert.ok(env.includes('EnvironmentOperationalViewRouter'));
  assert.ok(env.includes('EnvironmentGovernanceViewRouter'));
  assert.ok(env.includes('EnvironmentTelemetryViewRouter'));
});

test('Safety ptw and epi render governance hub not placeholder', () => {
  const safety = read('domains/safety/operational-runtime/SafetyOperationalWorkspace.jsx');
  assert.ok(safety.includes("view === 'governance' || view === 'ptw' || view === 'epi'"));
  assert.ok(safety.includes('SafetyGovernanceHub'));
});

test('Environment workspace page remounts on view change', () => {
  const page = read('domains/environment/routes/EnvironmentOperationalWorkspacePage.jsx');
  assert.ok(page.includes('useLocation'));
  assert.ok(page.includes('key={routeKey}') || page.includes('key={`'));
});

test('EOX shell does not replace domain children with layout substitute', () => {
  const shell = fs.readFileSync(path.join(EOX, 'EoxModuleShell.jsx'), 'utf8');
  assert.ok(shell.includes('eox-module-shell-content'));
  assert.ok(!shell.includes('IndustrialModuleLayout'));
  assert.ok(!shell.includes('QualityOperationalWorkspace'));
});

test('useEoxHubHeaderVisible only suppresses duplicate h1 headers', () => {
  const hook = read('presentation/eox/useEoxHubHeaderVisible.js');
  assert.ok(hook.includes('suppressHubHeader'));
  const hub = read('domains/quality/operational-runtime/QualityOperationalHub.jsx');
  assert.ok(hub.includes('impetus-card'), 'hub cards preserved');
  assert.ok(hub.includes('Link to='), 'hub shortcuts preserved');
});

test('Quality status bar remains outside EOX shell', () => {
  const qshell = read('domains/quality/operational-runtime/QualityOperationalShell.jsx');
  assert.ok(qshell.includes('QualityRealtimeStatusBar'));
  const idx = qshell.indexOf('QualityRealtimeStatusBar');
  const outletIdx = qshell.indexOf('<Outlet');
  assert.ok(idx < outletIdx, 'status bar before outlet');
});

test('registry includes environment governance views for breadcrumb', () => {
  const reg = fs.readFileSync(path.join(EOX, 'eoxRegistry.js'), 'utf8');
  for (const v of ['governance', 'intelligence', 'rollout', 'resilience', 'epi']) {
    assert.ok(reg.includes(`${v}:`), v);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
