/**
 * AIOI-P7.2 — Knowledge Catalog Audit
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

const catalog = require('../../services/aioi/aioiKnowledgeCatalogService');

const CATEGORIES = [
  'workflow_knowledge', 'execution_knowledge', 'learning_knowledge',
  'sla_knowledge', 'risk_knowledge', 'tenant_knowledge', 'compliance_knowledge'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P7.2 — Knowledge Catalog Audit\n');

  await test('KC-DOC: spec existe', () => assert(readDoc('AIOI_KNOWLEDGE_CATALOG_SPECIFICATION.md')));
  await test('KC-01: getKnowledgeCatalog', () => assert(typeof catalog.getKnowledgeCatalog === 'function'));

  for (const c of CATEGORIES) {
    await test(`KC-CAT: ${c}`, () => assert(readSrc('services/aioi/aioiKnowledgeCatalogService.js').includes(c)));
  }

  await test('KC-02: getKnowledgeCatalog executa', async () => {
    const r = await catalog.getKnowledgeCatalog();
    assert(r.ok);
    assert(r.catalog_entry_count >= 0);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
