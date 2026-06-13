/**
 * AIOI-P11.6 — Recommendation Readiness Audit
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

const readiness = require('../../services/aioi/aioiRecommendationReadinessService');

const CRR_IDS = ['CRR-01', 'CRR-02', 'CRR-03', 'CRR-04', 'CRR-05', 'CRR-06', 'CRR-07', 'CRR-08'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P11.6 — Recommendation Readiness Audit\n');

  await test('CRR-DOC: spec existe', () => assert(readDoc('AIOI_RECOMMENDATION_READINESS_SPECIFICATION.md')));
  await test('CRR-01: validateRecommendationReadiness', () => assert(typeof readiness.validateRecommendationReadiness === 'function'));

  for (const id of CRR_IDS) {
    await test(`${id}: implementado`, () => assert(readSrc('services/aioi/aioiRecommendationReadinessService.js').includes(`'${id}'`)));
  }

  await test('CRR-09: invariants runtime', async () => {
    const r = await readiness.validateRecommendationReadiness();
    assert.strictEqual(r.invariants.cognitive_execution_allowed, false);
  });

  await test('CRR-10: recommendation_readiness flag', async () => {
    const r = await readiness.validateRecommendationReadiness();
    assert(typeof r.recommendation_readiness === 'boolean');
    assert.strictEqual(r.total_checks, 8);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
