/**
 * AIOI-P12.5 — Human Review Safety Audit
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

const safety = require('../../services/aioi/aioiHumanReviewSafetyService');

const HRS_IDS = ['HRS-01', 'HRS-02', 'HRS-03', 'HRS-04', 'HRS-05', 'HRS-06', 'HRS-07', 'HRS-08'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P12.5 — Human Review Safety Audit\n');

  await test('HRS-DOC: spec existe', () => assert(readDoc('AIOI_HUMAN_REVIEW_SAFETY_SPECIFICATION.md')));
  await test('HRS-01: validateHumanReviewSafety', () => assert(typeof safety.validateHumanReviewSafety === 'function'));

  for (const id of HRS_IDS) {
    await test(`${id}: implementado`, () => assert(readSrc('services/aioi/aioiHumanReviewSafetyService.js').includes(`'${id}'`)));
  }

  await test('HRS-09: validateHumanReviewSafety executa', async () => {
    const r = await safety.validateHumanReviewSafety();
    assert.strictEqual(r.total_checks, 8);
    assert.strictEqual(r.safety_valid, true);
    assert.strictEqual(r.pass_count, 8);
    assert.strictEqual(r.invariants.cognitive_execution_allowed, false);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
