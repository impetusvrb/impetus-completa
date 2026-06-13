/**
 * AIOI-P15.2 — Runtime Validation Catalog Audit
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

const catalog = require('../../services/aioi/aioiRuntimeValidationCatalogService');

const CATEGORIES = ['governance', 'compliance', 'assurance', 'knowledge', 'observation', 'recommendation', 'human_review', 'authorization', 'simulation'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P15.2 — Runtime Validation Catalog Audit\n');

  await test('RVC-DOC: spec existe', () => assert(readDoc('AIOI_RUNTIME_VALIDATION_CATALOG_SPECIFICATION.md')));
  await test('RVC-01: getRuntimeValidationCatalog', () => assert(typeof catalog.getRuntimeValidationCatalog === 'function'));
  await test('RVC-02: getRuntimeValidationsByCategory', () => assert(typeof catalog.getRuntimeValidationsByCategory === 'function'));

  for (const c of CATEGORIES) {
    await test(`RVC-CAT: ${c}`, () => assert(readSrc('services/aioi/aioiRuntimeValidationCatalogService.js').includes(`'${c}'`)));
  }

  await test('RVC-03: getRuntimeValidationCatalog executa', async () => {
    const r = await catalog.getRuntimeValidationCatalog();
    assert(r.ok);
    assert.strictEqual(r.categories.length, 9);
    assert.strictEqual(r.total_validations, 9);
    for (const c of CATEGORIES) assert(Array.isArray(r.catalog[c]));
  });

  await test('RVC-04: getRuntimeValidationsByCategory executa', async () => {
    const r = await catalog.getRuntimeValidationsByCategory('simulation');
    assert(r.ok);
    assert.strictEqual(r.category, 'simulation');
    assert.strictEqual(r.count, 1);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
