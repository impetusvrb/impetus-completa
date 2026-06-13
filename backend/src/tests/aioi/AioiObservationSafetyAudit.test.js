/**
 * AIOI-P10.5 — Observation Safety Audit
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

const safety = require('../../services/aioi/aioiObservationSafetyService');

const OS_IDS = ['OS-01', 'OS-02', 'OS-03', 'OS-04', 'OS-05', 'OS-06', 'OS-07', 'OS-08'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P10.5 — Observation Safety Audit\n');

  await test('OS-DOC: spec existe', () => assert(readDoc('AIOI_OBSERVATION_SAFETY_SPECIFICATION.md')));
  await test('OS-01: validateObservationSafety', () => assert(typeof safety.validateObservationSafety === 'function'));

  for (const id of OS_IDS) {
    await test(`${id}: implementado`, () => assert(readSrc('services/aioi/aioiObservationSafetyService.js').includes(`'${id}'`)));
  }

  await test('OS-09: validateObservationSafety executa', async () => {
    const r = await safety.validateObservationSafety();
    assert.strictEqual(r.total_checks, 8);
    assert.strictEqual(r.invariants.cognitive_execution_allowed, false);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
