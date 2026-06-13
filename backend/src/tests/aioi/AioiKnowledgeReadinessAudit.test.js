/**
 * AIOI-P7.6 — Knowledge Readiness Audit
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');

function readDoc(n) { return fs.existsSync(path.join(DOCS, n)) ? fs.readFileSync(path.join(DOCS, n), 'utf8') : null; }
function readSrc(r) { return fs.existsSync(path.join(BACKEND_ROOT, 'src', r)) ? fs.readFileSync(path.join(BACKEND_ROOT, 'src', r), 'utf8') : null; }

const readiness = require('../../services/aioi/aioiKnowledgeReadinessService');

const KR_IDS = ['KR-01', 'KR-02', 'KR-03', 'KR-04', 'KR-05', 'KR-06', 'KR-07', 'KR-08'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P7.6 — Knowledge Readiness Audit\n');

  await test('KR-DOC: spec existe', () => assert(readDoc('AIOI_KNOWLEDGE_READINESS_SPECIFICATION.md')));
  await test('KR-01: validateKnowledgeReadiness', () => assert(typeof readiness.validateKnowledgeReadiness === 'function'));

  for (const id of KR_IDS) {
    await test(`${id}: implementado`, () => assert(readSrc('services/aioi/aioiKnowledgeReadinessService.js').includes(`'${id}'`)));
  }

  await test('KR-09: invariants runtime', async () => {
    const r = await readiness.validateKnowledgeReadiness();
    assert.strictEqual(r.invariants.cognitive_execution_allowed, false);
  });

  await test('KR-10: knowledge_readiness flag', async () => {
    const r = await readiness.validateKnowledgeReadiness();
    assert(typeof r.knowledge_readiness === 'boolean');
    assert.strictEqual(r.total_checks, 8);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
