/**
 * UX-001 — Frontend navigation tests (Presentation Layer).
 */
import assert from 'node:assert/strict';
import { buildPresentationNavigationSections, listPresentationRegistryDomains } from '../../presentation/navigation/presentationNavigationRegistry.js';
import { mergePresentationNavigationIntoMenu } from '../../presentation/navigation/mergePresentationNavigation.js';
import { listLogisticsWmsPresentationPaths } from '../../presentation/navigation/adapters/logisticsWmsPresentationAdapter.js';

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

console.log('UX-001 — Frontend Navigation\n');

test('presentation registry lists domains', () => {
  const d = listPresentationRegistryDomains();
  assert.ok(d.includes('logistics_wms'));
  assert.ok(d.includes('supply'));
});

test('merge injects section headers when WMS visible', () => {
  const base = [{ path: '/app', label: 'Dashboard' }];
  const merged = mergePresentationNavigationIntoMenu(base, { suppressDomainSections: false });
  const hasHeader = merged.some((i) => i.presentationType === 'section-header' && i.label === 'LOGÍSTICA');
  const hasWmsNav = merged.some((i) => i._presentation_domain === 'logistics_wms');
  if (listLogisticsWmsPresentationPaths().length) {
    assert.equal(hasHeader, true);
    assert.equal(hasWmsNav, true);
  } else {
    assert.ok(true, 'WMS flags off — skip inject assertion');
  }
});

test('WMS paths use existing workspace routes only', () => {
  for (const p of listLogisticsWmsPresentationPaths()) {
    assert.ok(p.startsWith('/app/logistics-operational/workspace'), p);
  }
});

test('suppressDomainSections blocks presentation merge', () => {
  const base = [{ path: '/app', label: 'Dashboard' }];
  const merged = mergePresentationNavigationIntoMenu(base, { suppressDomainSections: true });
  assert.equal(merged.length, 1);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
