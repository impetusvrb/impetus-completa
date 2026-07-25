/**
 * ARC-003 — Enterprise Operational Experience Standard (EOX) tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EOX_DOMAIN_REGISTRY,
  resolveLogisticsOperationalNavigation,
  resolveQualityOperationalNavigation,
  resolveSafetyOperationalNavigation,
  resolveEnvironmentOperationalNavigation,
  resolveLogisticsHubNavigation,
  buildEoxNavigationConfig
} from '../../presentation/eox/eoxRegistry.js';
import { EOX_PHASE } from '../../presentation/eox/eoxTokens.js';

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

console.log('ARC-003 — Enterprise Operational Experience Standard Tests\n');

test('EOX component library exists', () => {
  for (const f of [
    'EoxHeader.jsx',
    'EoxModuleShell.jsx',
    'EoxActionBar.jsx',
    'eoxRegistry.js',
    'eoxObservability.js',
    'eox.css',
    'index.js'
  ]) {
    assert.ok(fs.existsSync(path.join(EOX, f)), f);
  }
});

test('EOX phase is ARC-003', () => {
  assert.equal(EOX_PHASE, 'ARC-003');
});

test('single EoxHeader — no duplicate domain headers', () => {
  const header = fs.readFileSync(path.join(EOX, 'EoxHeader.jsx'), 'utf8');
  assert.ok(header.includes('EoxHeader'));
  assert.ok(!header.includes('QualityNavigationHeader'));
  assert.ok(!header.includes('WarehouseNavigationHeader'));
});

test('breadcrumb IMPETUS > Domínio > Módulo for WMS warehouses', () => {
  const cfg = resolveLogisticsOperationalNavigation('/app/logistics/warehouses');
  assert.equal(cfg.module, 'Armazéns');
  assert.ok(cfg.breadcrumb.some((b) => b.label === 'IMPETUS' && b.path === '/app'));
  assert.ok(cfg.breadcrumb.some((b) => b.label === 'Logística' && b.path === '/app/logistics/operational'));
  assert.ok(cfg.breadcrumb.some((b) => b.label === 'Armazéns' && b.current));
});

test('returns use Centro Cognitivo and domain landing — never history.back', () => {
  const cfg = resolveQualityOperationalNavigation('/app/quality/operational/inspection');
  assert.equal(cfg.ccBackTarget.path, '/app');
  assert.equal(cfg.ccBackTarget.shortLabel, 'Centro Cognitivo');
  assert.equal(cfg.backTarget.path, '/app/quality/operational');
  const header = fs.readFileSync(path.join(EOX, 'EoxHeader.jsx'), 'utf8');
  assert.ok(!header.includes('history.back'));
});

test('quality, safety, environment domains active in EOX registry', () => {
  for (const id of ['quality', 'safety', 'environment', 'logistics_wms']) {
    assert.equal(EOX_DOMAIN_REGISTRY[id].active, true, id);
    assert.ok(EOX_DOMAIN_REGISTRY[id].domainLandingPath.includes('/operational'), id);
  }
});

test('supply and finance registered as future EOX consumers', () => {
  assert.equal(EOX_DOMAIN_REGISTRY.supply.active, false);
  assert.equal(EOX_DOMAIN_REGISTRY.finance.active, false);
  assert.ok(EOX_DOMAIN_REGISTRY.supply.hubSubtitle.includes('futuro'));
});

test('domain nav layouts wired in App.jsx', () => {
  const app = read('App.jsx');
  for (const layout of [
    'QualityOperationalNavLayout',
    'SafetyOperationalNavLayout',
    'EnvironmentOperationalNavLayout',
    'LogisticsOperationalNavLayout'
  ]) {
    assert.ok(app.includes(layout), layout);
  }
});

test('hub headers suppressed when EOX active', () => {
  const quality = read('domains/quality/operational-runtime/QualityOperationalHub.jsx');
  assert.ok(quality.includes('useEoxHubHeaderVisible'));
  const safety = read('domains/safety/operational-runtime/SafetyOperationalWorkspace.jsx');
  assert.ok(safety.includes('useEoxHubHeaderVisible'));
});

test('ONX adapters preserved over EOX', () => {
  const onxHeader = read('presentation/operational-navigation/OperationalNavigationHeader.jsx');
  assert.ok(onxHeader.includes('EoxHeader'));
  const onxShell = read('presentation/operational-navigation/OperationalModuleShell.jsx');
  assert.ok(onxShell.includes('EoxModuleShell'));
});

test('industrial module header suppressed via EOX context', () => {
  const layout = read('presentation/industrial-module/IndustrialModuleLayout.jsx');
  assert.ok(layout.includes('suppressModuleHeader'));
  const shell = fs.readFileSync(path.join(EOX, 'EoxModuleShell.jsx'), 'utf8');
  assert.ok(shell.includes('suppressModuleHeader: true'));
  assert.ok(shell.includes('suppressHubHeader: true'));
});

test('EOX observability events defined', () => {
  const obs = fs.readFileSync(path.join(EOX, 'eoxObservability.js'), 'utf8');
  for (const ev of [
    'EOX_HEADER_RENDER',
    'EOX_BREADCRUMB_NAVIGATION',
    'EOX_DOMAIN_RETURN',
    'EOX_GLOBAL_RETURN'
  ]) {
    assert.ok(obs.includes(ev), ev);
  }
});

test('logistics hub resolves view breadcrumb', () => {
  const cfg = resolveLogisticsHubNavigation('/app/logistics/operational', '?view=receiving');
  assert.equal(cfg.module, 'Recebimento');
});

test('buildEoxNavigationConfig sets ARC-003 phase', () => {
  const cfg = buildEoxNavigationConfig({
    domainId: 'quality',
    domainLabel: 'Qualidade',
    moduleLabel: 'Qualidade',
    modulePath: '/app/quality/operational',
    backTarget: { path: '/app/quality/operational', label: 'Voltar' },
    breadcrumb: []
  });
  assert.equal(cfg.eoxPhase, 'ARC-003');
  assert.equal(cfg.navPhase, 'ARC-003');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
