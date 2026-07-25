/**
 * NAV-002 — Operational Navigation Experience (ONX) tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveLogisticsOperationalNavigation,
  OPERATIONAL_DOMAIN_REGISTRY,
  buildOperationalNavigationConfig
} from '../../presentation/operational-navigation/operationalNavigationRegistry.js';
import { parseOperationalDeepLink, buildOperationalDeepLinkHref } from '../../presentation/operational-navigation/operationalNavigationDeepLink.js';
import { ONX_PHASE } from '../../presentation/operational-navigation/operationalNavigationTokens.js';
import { EOX_PHASE } from '../../presentation/eox/eoxTokens.js';

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

console.log('NAV-002 — Operational Navigation Experience Tests\n');

test('ONX component library exists', () => {
  for (const f of [
    'OperationalNavigationHeader.jsx',
    'OperationalModuleShell.jsx',
    'operationalNavigationRegistry.js',
    'operationalNavigationDeepLink.js',
    'operational-navigation.css',
    'index.js'
  ]) {
    assert.ok(fs.existsSync(path.join(ONX, f)), f);
  }
});

test('single generic header — no domain-specific headers', () => {
  const header = fs.readFileSync(path.join(ONX, 'OperationalNavigationHeader.jsx'), 'utf8');
  assert.ok(header.includes('OperationalNavigationHeader'));
  assert.ok(!header.includes('WarehouseNavigationHeader'));
  assert.ok(!header.includes('InventoryNavigationHeader'));
});

test('breadcrumb dynamic for warehouses', () => {
  const cfg = resolveLogisticsOperationalNavigation('/app/logistics/warehouses');
  assert.equal(cfg.domain, 'Logística');
  assert.equal(cfg.module, 'Armazéns');
  assert.ok(cfg.breadcrumb.some((b) => b.label === 'IMPETUS'));
  assert.ok(cfg.breadcrumb.some((b) => b.label === 'Logística'));
  assert.ok(cfg.breadcrumb.some((b) => b.label === 'Armazéns'));
  assert.equal(cfg.phase, 'OPM-001C');
});

test('back target uses official route not history.back', () => {
  const cfg = resolveLogisticsOperationalNavigation('/app/logistics/inventory');
  assert.ok(cfg.backTarget.path.includes('/app/logistics/operational'));
  assert.ok(cfg.backTarget.label.includes('Logística'));
  const routes = read('domains/logistics-operational/pages/WmsLogisticsStandaloneRoutes.jsx');
  assert.ok(!routes.includes('history.back'));
  const header = fs.readFileSync(path.join(FE, 'src/presentation/eox/EoxHeader.jsx'), 'utf8');
  assert.ok(header.includes('Link'));
  assert.ok(!header.includes('history.back'));
});

test('all six logistics modules resolve navigation', () => {
  for (const seg of ['warehouses', 'inventory', 'receiving', 'picking', 'shipping', 'transfers', 'warehouse-intelligence', 'cognitive-logistics']) {
    const cfg = resolveLogisticsOperationalNavigation(`/app/logistics/${seg}`);
    assert.ok(cfg.module, seg);
    assert.equal(cfg.domainId, 'logistics_wms');
  }
});

test('future domains prepared in registry', () => {
  for (const id of ['supply', 'finance', 'production', 'ppap', 'msa', 'ishikawa']) {
    assert.ok(OPERATIONAL_DOMAIN_REGISTRY[id], id);
    assert.equal(OPERATIONAL_DOMAIN_REGISTRY[id].active, false);
  }
  for (const id of ['quality', 'environment', 'safety']) {
    assert.ok(OPERATIONAL_DOMAIN_REGISTRY[id], id);
    assert.equal(OPERATIONAL_DOMAIN_REGISTRY[id].active, true, `${id} active via ARC-003`);
  }
});

test('deep link architecture parse/build', () => {
  const ctx = parseOperationalDeepLink('?onx_source=cognitive_center&onx_intent=rupture&onx_filter_status=open');
  assert.equal(ctx.source, 'cognitive_center');
  assert.equal(ctx.intent, 'rupture');
  assert.equal(ctx.filters.status, 'open');
  const href = buildOperationalDeepLinkHref(ctx, '/app/logistics/inventory');
  assert.ok(href.includes('onx_source=cognitive_center'));
});

test('WmsLogisticsStandaloneRoutes uses ONX layout', () => {
  const routes = read('domains/logistics-operational/pages/WmsLogisticsStandaloneRoutes.jsx');
  assert.ok(routes.includes('WmsOperationalNavLayout'));
  assert.ok(routes.includes('NAV-002'));
});

test('NAV-001 resolver untouched', () => {
  const nav = read('presentation/navigation/domainNavigationResolver.js');
  assert.ok(nav.includes('NAV-001'));
  assert.ok(!nav.includes('NAV-002'));
});

test('buildOperationalNavigationConfig is generic', () => {
  const cfg = buildOperationalNavigationConfig({
    domainId: 'supply',
    domainLabel: 'Supply',
    moduleLabel: 'Promoções',
    modulePath: '/app/supply/promotions',
    subtitle: 'Test',
    version: 'v1',
    phase: 'PLANNED',
    backTarget: { path: '/app/supply', label: 'Voltar' },
    breadcrumb: [{ label: 'IMPETUS', path: '/app' }]
  });
  assert.equal(cfg.module, 'Promoções');
  assert.equal(cfg.navPhase, EOX_PHASE);
  assert.equal(ONX_PHASE, 'NAV-002A');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
