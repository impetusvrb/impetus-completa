/**
 * AIOI-P10.2 — Observation Catalog Audit
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

const catalog = require('../../services/aioi/aioiObservationCatalogService');

const CATEGORIES = ['workflow', 'decision', 'sla', 'risk', 'capacity', 'compliance', 'governance'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P10.2 — Observation Catalog Audit\n');

  await test('OC-DOC: spec existe', () => assert(readDoc('AIOI_OBSERVATION_CATALOG_SPECIFICATION.md')));
  await test('OC-01: getObservationCatalog', () => assert(typeof catalog.getObservationCatalog === 'function'));
  await test('OC-02: getObservationsByCategory', () => assert(typeof catalog.getObservationsByCategory === 'function'));

  for (const c of CATEGORIES) {
    await test(`OC-CAT: ${c}`, () => assert(readSrc('services/aioi/aioiObservationCatalogService.js').includes(`'${c}'`)));
  }

  await test('OC-03: getObservationCatalog executa', async () => {
    const r = await catalog.getObservationCatalog();
    assert(r.total_observations >= 6);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
