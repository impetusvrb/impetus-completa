/**
 * AIOI-P9.6 — Cognitive Readiness Audit
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');

function readDoc(n) { return fs.existsSync(path.join(DOCS, n)) ? fs.readFileSync(path.join(DOCS, n), 'utf8') : null; }
function readSrc(r) { return fs.existsSync(path.join(BACKEND_ROOT, 'src', r)) ? fs.readFileSync(path.join(BACKEND_ROOT, 'src', r), 'utf8') : null; }

const readiness = require('../../services/aioi/aioiCognitiveReadinessService');

const CRG_IDS = ['CRG-01', 'CRG-02', 'CRG-03', 'CRG-04', 'CRG-05', 'CRG-06', 'CRG-07', 'CRG-08'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P9.6 — Cognitive Readiness Audit\n');

  await test('CRG-DOC: spec existe', () => assert(readDoc('AIOI_COGNITIVE_READINESS_SPECIFICATION.md')));
  await test('CRG-01: validateCognitiveReadiness', () => assert(typeof readiness.validateCognitiveReadiness === 'function'));

  for (const id of CRG_IDS) {
    await test(`${id}: implementado`, () => assert(readSrc('services/aioi/aioiCognitiveReadinessService.js').includes(`'${id}'`)));
  }

  await test('CRG-09: invariants runtime', async () => {
    const r = await readiness.validateCognitiveReadiness();
    assert.strictEqual(r.invariants.cognitive_execution_allowed, false);
  });

  await test('CRG-10: cognitive_readiness flag', async () => {
    const r = await readiness.validateCognitiveReadiness();
    assert(typeof r.cognitive_readiness === 'boolean');
    assert.strictEqual(r.total_checks, 8);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
