/**
 * AIOI-P12.2 — Decision Review Catalog Audit
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

const catalog = require('../../services/aioi/aioiDecisionReviewCatalogService');

const CATEGORIES = ['workflow', 'decision', 'sla', 'risk', 'capacity', 'governance', 'compliance'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P12.2 — Decision Review Catalog Audit\n');

  await test('DRC-DOC: spec existe', () => assert(readDoc('AIOI_DECISION_REVIEW_CATALOG_SPECIFICATION.md')));
  await test('DRC-01: getDecisionReviewCatalog', () => assert(typeof catalog.getDecisionReviewCatalog === 'function'));
  await test('DRC-02: getReviewsByCategory', () => assert(typeof catalog.getReviewsByCategory === 'function'));

  for (const c of CATEGORIES) {
    await test(`DRC-CAT: ${c}`, () => assert(readSrc('services/aioi/aioiDecisionReviewCatalogService.js').includes(`'${c}'`)));
  }

  await test('DRC-03: getDecisionReviewCatalog executa', async () => {
    const r = await catalog.getDecisionReviewCatalog();
    assert(r.ok);
    assert.strictEqual(r.categories.length, 7);
    assert(r.total_packages >= 6);
    for (const c of CATEGORIES) assert(Array.isArray(r.catalog[c]));
  });

  await test('DRC-04: getReviewsByCategory executa', async () => {
    const r = await catalog.getReviewsByCategory('governance');
    assert(r.ok);
    assert.strictEqual(r.category, 'governance');
    assert(Array.isArray(r.reviews));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
