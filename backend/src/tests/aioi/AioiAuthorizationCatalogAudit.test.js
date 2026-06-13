/**
 * AIOI-P13.2 — Authorization Catalog Audit
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

const catalog = require('../../services/aioi/aioiAuthorizationCatalogService');

const CATEGORIES = ['workflow', 'decision', 'sla', 'risk', 'capacity', 'governance', 'compliance'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P13.2 — Authorization Catalog Audit\n');

  await test('AC-DOC: spec existe', () => assert(readDoc('AIOI_AUTHORIZATION_CATALOG_SPECIFICATION.md')));
  await test('AC-01: getAuthorizationCatalog', () => assert(typeof catalog.getAuthorizationCatalog === 'function'));
  await test('AC-02: getAuthorizationsByCategory', () => assert(typeof catalog.getAuthorizationsByCategory === 'function'));

  for (const c of CATEGORIES) {
    await test(`AC-CAT: ${c}`, () => assert(readSrc('services/aioi/aioiAuthorizationCatalogService.js').includes(`'${c}'`)));
  }

  await test('AC-03: getAuthorizationCatalog executa', async () => {
    const r = await catalog.getAuthorizationCatalog();
    assert(r.ok);
    assert.strictEqual(r.categories.length, 7);
    assert.strictEqual(r.total_models, 7);
    for (const c of CATEGORIES) assert(Array.isArray(r.catalog[c]));
  });

  await test('AC-04: getAuthorizationsByCategory executa', async () => {
    const r = await catalog.getAuthorizationsByCategory('governance');
    assert(r.ok);
    assert.strictEqual(r.category, 'governance');
    assert.strictEqual(r.count, 1);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
