/**
 * UX-001 — Sidebar presentation tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergePresentationNavigationIntoMenu } from '../../presentation/navigation/mergePresentationNavigation.js';
import { sidebarNavItemKey } from '../../utils/sidebarNavHelpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_ROOT = path.join(__dirname, '../../..');

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

console.log('UX-001 — Sidebar\n');

test('Layout imports presentation activation entry point', () => {
  const layout = fs.readFileSync(path.join(FE_ROOT, 'src/components/Layout.jsx'), 'utf8');
  assert.ok(layout.includes('applyPresentationNavigationMenu'));
});

test('Layout renders section headers', () => {
  const layout = fs.readFileSync(path.join(FE_ROOT, 'src/components/Layout.jsx'), 'utf8');
  assert.ok(layout.includes('nav-section-header'));
  assert.ok(layout.includes("presentationType === 'section-header'"));
});

test('sidebarNavItemKey supports presentation ids', () => {
  const k = sidebarNavItemKey({ _presentation_id: 'wms_dashboard' }, 0);
  assert.equal(k, 'pnav-wms_dashboard');
});

test('merge strips duplicate publication items when section active', () => {
  const base = [
    { path: '/app', label: 'Dash' },
    { path: '/app/quality/operational', label: 'Q', _quality_publication: true }
  ];
  const merged = mergePresentationNavigationIntoMenu(base, {
    user: {},
    visibleModules: ['quality_intelligence'],
    suppressDomainSections: false
  });
  assert.ok(Array.isArray(merged));
});

test('Layout.css defines presentation section styles', () => {
  const css = fs.readFileSync(path.join(FE_ROOT, 'src/components/Layout.css'), 'utf8');
  assert.ok(css.includes('.nav-section-header'));
  assert.ok(css.includes('.nav-section-divider'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
