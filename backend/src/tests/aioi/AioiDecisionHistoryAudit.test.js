/**
 * AIOI-P8.2 — Decision History Audit
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
function stripComments(c) { return c.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//')).join('\n'); }

const history = require('../../services/aioi/aioiDecisionHistoryCatalogService');

const DIMENSIONS = [
  'decision_types', 'decision_outcomes', 'execution_outcomes',
  'tenant_outcomes', 'workflow_outcomes'
];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P8.2 — Decision History Audit\n');

  await test('DH-DOC: spec existe', () => assert(readDoc('AIOI_DECISION_HISTORY_SPECIFICATION.md')));
  await test('DH-01: getDecisionHistoryCatalog', () => assert(typeof history.getDecisionHistoryCatalog === 'function'));

  for (const d of DIMENSIONS) {
    await test(`DH-DIM: ${d}`, () => assert(readSrc('services/aioi/aioiDecisionHistoryCatalogService.js').includes(d)));
  }

  await test('DH-02: sem modificar histórico', () => {
    const c = stripComments(readSrc('services/aioi/aioiDecisionHistoryCatalogService.js'));
    assert(!c.includes('UPDATE industrial_operational_events'));
    assert(c.includes('history_mutation'));
  });

  await test('DH-03: getDecisionHistoryCatalog executa', async () => {
    const r = await history.getDecisionHistoryCatalog();
    assert.strictEqual(r.history_mutation, false);
    assert(r.catalog_entry_count >= 0);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
