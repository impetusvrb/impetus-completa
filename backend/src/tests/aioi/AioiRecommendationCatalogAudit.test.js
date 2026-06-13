/**
 * AIOI-P11.2 — Recommendation Catalog Audit
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

const catalog = require('../../services/aioi/aioiRecommendationCatalogService');

const CATEGORIES = ['workflow', 'sla', 'risk', 'capacity', 'compliance', 'governance', 'decision'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P11.2 — Recommendation Catalog Audit\n');

  await test('RC-DOC: spec existe', () => assert(readDoc('AIOI_RECOMMENDATION_CATALOG_SPECIFICATION.md')));
  await test('RC-01: getRecommendationCatalog', () => assert(typeof catalog.getRecommendationCatalog === 'function'));
  await test('RC-02: getRecommendationsByCategory', () => assert(typeof catalog.getRecommendationsByCategory === 'function'));

  for (const c of CATEGORIES) {
    await test(`RC-CAT: ${c}`, () => assert(readSrc('services/aioi/aioiRecommendationCatalogService.js').includes(`'${c}'`)));
  }

  await test('RC-03: getRecommendationCatalog executa', async () => {
    const r = await catalog.getRecommendationCatalog();
    assert(r.ok);
    assert.strictEqual(r.categories.length, 7);
    assert(r.total_recommendations >= 6);
    for (const c of CATEGORIES) assert(Array.isArray(r.catalog[c]));
  });

  await test('RC-04: getRecommendationsByCategory executa', async () => {
    const r = await catalog.getRecommendationsByCategory('governance');
    assert(r.ok);
    assert.strictEqual(r.category, 'governance');
    assert(Array.isArray(r.recommendations));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
