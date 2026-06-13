/**
 * AIOI-P10.6 — Observation Readiness Audit
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');

function readDoc(n) { return fs.existsSync(path.join(DOCS, n)) ? fs.readFileSync(path.join(DOCS, n), 'utf8') : null; }
function readSrc(r) { return fs.existsSync(path.join(BACKEND_ROOT, 'src', r)) ? fs.readFileSync(path.join(BACKEND_ROOT, 'src', r), 'utf8') : null; }

const readiness = require('../../services/aioi/aioiObservationReadinessService');

const COF_IDS = ['COF-01', 'COF-02', 'COF-03', 'COF-04', 'COF-05', 'COF-06', 'COF-07', 'COF-08'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P10.6 — Observation Readiness Audit\n');

  await test('COF-DOC: spec existe', () => assert(readDoc('AIOI_OBSERVATION_READINESS_SPECIFICATION.md')));
  await test('COF-01: validateObservationReadiness', () => assert(typeof readiness.validateObservationReadiness === 'function'));

  for (const id of COF_IDS) {
    await test(`${id}: implementado`, () => assert(readSrc('services/aioi/aioiObservationReadinessService.js').includes(`'${id}'`)));
  }

  await test('COF-09: invariants runtime', async () => {
    const r = await readiness.validateObservationReadiness();
    assert.strictEqual(r.invariants.cognitive_execution_allowed, false);
  });

  await test('COF-10: observation_readiness flag', async () => {
    const r = await readiness.validateObservationReadiness();
    assert(typeof r.observation_readiness === 'boolean');
    assert.strictEqual(r.total_checks, 8);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
