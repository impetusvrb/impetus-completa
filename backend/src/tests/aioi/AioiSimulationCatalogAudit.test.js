/**
 * AIOI-P14.2 — Simulation Catalog Audit
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const SRC = path.join(BACKEND_ROOT, 'src');

function readDoc(n) { return fs.existsSync(path.join(DOCS, n)) ? fs.readFileSync(path.join(DOCS, n), 'utf8') : null; }
function readSrc(r) { return fs.existsSync(path.join(SRC, r)) ? fs.readFileSync(path.join(SRC, r), 'utf8') : null; }

const catalog = require('../../services/aioi/aioiSimulationCatalogService');

const CATEGORIES = ['workflow', 'decision', 'sla', 'risk', 'capacity', 'governance', 'compliance'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P14.2 — Simulation Catalog Audit\n');

  await test('SC-DOC: spec existe', () => assert(readDoc('AIOI_SIMULATION_CATALOG_SPECIFICATION.md')));
  await test('SC-01: getSimulationCatalog', () => assert(typeof catalog.getSimulationCatalog === 'function'));
  await test('SC-02: getSimulationsByCategory', () => assert(typeof catalog.getSimulationsByCategory === 'function'));

  for (const c of CATEGORIES) {
    await test(`SC-CAT: ${c}`, () => assert(readSrc('services/aioi/aioiSimulationCatalogService.js').includes(`'${c}'`)));
  }

  await test('SC-03: getSimulationCatalog executa', async () => {
    const r = await catalog.getSimulationCatalog();
    assert(r.ok);
    assert.strictEqual(r.categories.length, 7);
    assert.strictEqual(r.total_simulations, 7);
    for (const c of CATEGORIES) assert(Array.isArray(r.catalog[c]));
  });

  await test('SC-04: getSimulationsByCategory executa', async () => {
    const r = await catalog.getSimulationsByCategory('governance');
    assert(r.ok);
    assert.strictEqual(r.category, 'governance');
    assert.strictEqual(r.count, 1);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
