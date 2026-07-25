/**
 * UX-001 — Workspace navigation tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getWorkspacePresentationSnapshot } from '../../presentation/workspace/workspacePresentationRegistry.js';
import { WMS_OPERATIONAL_BASE } from '../../domains/logistics-operational/routes/wmsOperationalRegistry.js';

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

console.log('UX-001 — Workspace Navigation\n');

test('workspace presentation registry covers WMS + Supply', () => {
  const snap = getWorkspacePresentationSnapshot();
  assert.ok(snap.domains.some((d) => d.domainId === 'logistics_wms'));
  assert.ok(snap.domains.some((d) => d.domainId === 'supply'));
});

test('App.jsx registers WMS workspace route', () => {
  const app = fs.readFileSync(path.join(FE_ROOT, 'src/App.jsx'), 'utf8');
  assert.ok(app.includes('/app/logistics-operational/workspace'));
});

test('WMS layout routes all modules', () => {
  const layout = fs.readFileSync(
    path.join(FE_ROOT, 'src/domains/logistics-operational/pages/WmsOperationalLayout.jsx'),
    'utf8'
  );
  for (const seg of ['warehouses', 'inventory', 'receiving', 'picking', 'shipping', 'transfers', 'warehouse-intelligence', 'cognitive-logistics']) {
    assert.ok(layout.includes(seg), seg);
  }
});

test('presentation paths align with WMS_OPERATIONAL_BASE', () => {
  assert.equal(WMS_OPERATIONAL_BASE, '/app/logistics-operational/workspace');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
