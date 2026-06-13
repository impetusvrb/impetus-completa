/**
 * AIOI-P15.5 — Runtime Safety Audit
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

const safety = require('../../services/aioi/aioiRuntimeSafetyService');

const RTS_IDS = ['RTS-01', 'RTS-02', 'RTS-03', 'RTS-04', 'RTS-05', 'RTS-06', 'RTS-07', 'RTS-08'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P15.5 — Runtime Safety Audit\n');

  await test('RTS-DOC: spec existe', () => assert(readDoc('AIOI_RUNTIME_SAFETY_SPECIFICATION.md')));
  await test('RTS-01: validateRuntimeSafety', () => assert(typeof safety.validateRuntimeSafety === 'function'));

  for (const id of RTS_IDS) {
    await test(`${id}: implementado`, () => assert(readSrc('services/aioi/aioiRuntimeSafetyService.js').includes(`'${id}'`)));
  }

  await test('RTS-09: validateRuntimeSafety executa', async () => {
    const r = await safety.validateRuntimeSafety();
    assert.strictEqual(r.total_checks, 8);
    assert.strictEqual(r.safety_valid, true);
    assert.strictEqual(r.pass_count, 8);
    assert.strictEqual(r.invariants.cognitive_execution_allowed, false);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
