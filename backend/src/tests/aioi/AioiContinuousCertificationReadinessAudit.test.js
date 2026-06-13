/**
 * AIOI-P6.6 — Continuous Certification Readiness Audit
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');

function readDoc(n) { return fs.existsSync(path.join(DOCS, n)) ? fs.readFileSync(path.join(DOCS, n), 'utf8') : null; }
function readSrc(r) { return fs.existsSync(path.join(BACKEND_ROOT, 'src', r)) ? fs.readFileSync(path.join(BACKEND_ROOT, 'src', r), 'utf8') : null; }

const readiness = require('../../services/aioi/aioiContinuousCertificationReadinessService');

const CR_IDS = ['CR-01', 'CR-02', 'CR-03', 'CR-04', 'CR-05', 'CR-06', 'CR-07', 'CR-08'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P6.6 — Continuous Certification Readiness Audit\n');

  await test('CR-DOC: spec existe', () => assert(readDoc('AIOI_CONTINUOUS_CERTIFICATION_READINESS_SPECIFICATION.md')));
  await test('CR-01: validateContinuousCertificationReadiness', () => assert(typeof readiness.validateContinuousCertificationReadiness === 'function'));

  for (const id of CR_IDS) {
    await test(`${id}: implementado`, () => assert(readSrc('services/aioi/aioiContinuousCertificationReadinessService.js').includes(`'${id}'`)));
  }

  await test('CR-09: invariants runtime', async () => {
    const r = await readiness.validateContinuousCertificationReadiness();
    assert.strictEqual(r.invariants.cognitive_execution_allowed, false);
  });

  await test('CR-10: continuous_readiness flag', async () => {
    const r = await readiness.validateContinuousCertificationReadiness();
    assert(typeof r.continuous_readiness === 'boolean');
    assert.strictEqual(r.total_checks, 8);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
