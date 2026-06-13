/**
 * AIOI-P11.5 — Recommendation Safety Audit
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

const safety = require('../../services/aioi/aioiRecommendationSafetyService');

const RS_IDS = ['RS-01', 'RS-02', 'RS-03', 'RS-04', 'RS-05', 'RS-06', 'RS-07', 'RS-08'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P11.5 — Recommendation Safety Audit\n');

  await test('RS-DOC: spec existe', () => assert(readDoc('AIOI_RECOMMENDATION_SAFETY_SPECIFICATION.md')));
  await test('RS-01: validateRecommendationSafety', () => assert(typeof safety.validateRecommendationSafety === 'function'));

  for (const id of RS_IDS) {
    await test(`${id}: implementado`, () => assert(readSrc('services/aioi/aioiRecommendationSafetyService.js').includes(`'${id}'`)));
  }

  await test('RS-09: validateRecommendationSafety executa', async () => {
    const r = await safety.validateRecommendationSafety();
    assert.strictEqual(r.total_checks, 8);
    assert.strictEqual(r.safety_valid, true);
    assert.strictEqual(r.pass_count, 8);
    assert.strictEqual(r.invariants.cognitive_execution_allowed, false);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
