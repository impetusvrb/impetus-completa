/**
 * AIOI-P12.6 — Human Decision Readiness Audit
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

const readiness = require('../../services/aioi/aioiHumanDecisionReadinessService');

const HDR_IDS = ['HDR-01', 'HDR-02', 'HDR-03', 'HDR-04', 'HDR-05', 'HDR-06', 'HDR-07', 'HDR-08'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P12.6 — Human Decision Readiness Audit\n');

  await test('HDR-DOC: spec existe', () => assert(readDoc('AIOI_HUMAN_DECISION_READINESS_SPECIFICATION.md')));
  await test('HDR-01: validateHumanDecisionReadiness', () => assert(typeof readiness.validateHumanDecisionReadiness === 'function'));

  for (const id of HDR_IDS) {
    await test(`${id}: implementado`, () => assert(readSrc('services/aioi/aioiHumanDecisionReadinessService.js').includes(`'${id}'`)));
  }

  await test('HDR-09: invariants runtime', async () => {
    const r = await readiness.validateHumanDecisionReadiness();
    assert.strictEqual(r.invariants.cognitive_execution_allowed, false);
  });

  await test('HDR-10: human_decision_readiness flag', async () => {
    const r = await readiness.validateHumanDecisionReadiness();
    assert(typeof r.human_decision_readiness === 'boolean');
    assert.strictEqual(r.total_checks, 8);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
