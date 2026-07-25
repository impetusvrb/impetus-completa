/**
 * UX-001A — Presentation Navigation Activation tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyPresentationNavigationMenu } from '../../presentation/navigation/applyPresentationNavigationMenu.js';

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

console.log('UX-001A — Presentation Navigation Activation\n');

test('Layout uses applyPresentationNavigationMenu (not legacy publication engines)', () => {
  const layout = fs.readFileSync(path.join(FE_ROOT, 'src/components/Layout.jsx'), 'utf8');
  assert.ok(layout.includes('applyPresentationNavigationMenu'));
  assert.ok(!layout.includes('safeMergeLogisticsPublicationIntoMenu'));
  assert.ok(!layout.includes('safeMergeQualityPublicationIntoMenu'));
});

test('Layout does not import safeMergePresentationNavigationIntoMenu directly', () => {
  const layout = fs.readFileSync(path.join(FE_ROOT, 'src/components/Layout.jsx'), 'utf8');
  assert.ok(!layout.includes('safeMergePresentationNavigationIntoMenu'));
});

test('presentation activation injects LOGÍSTICA when WMS menu visible', () => {
  const base = [{ path: '/app', label: 'Dashboard' }];
  const merged = applyPresentationNavigationMenu(base, { suppressDomainSections: false });
  const hasLogistics = merged.some((i) => i.presentationType === 'section-header' && i.label === 'LOGÍSTICA');
  if (merged.some((i) => i._presentation_domain === 'logistics_wms')) {
    assert.equal(hasLogistics, true);
  }
});

test('catch fallback path includes presentation activation in source', () => {
  const layout = fs.readFileSync(path.join(FE_ROOT, 'src/components/Layout.jsx'), 'utf8');
  const catchIdx = layout.indexOf('} catch (_menuBuildErr)');
  const catchBlock = layout.slice(catchIdx, catchIdx + 600);
  assert.ok(catchBlock.includes('applyPresentationNavigationMenu'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
