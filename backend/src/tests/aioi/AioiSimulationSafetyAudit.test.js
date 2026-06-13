/**
 * AIOI-P14.5 — Simulation Safety Audit
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

const safety = require('../../services/aioi/aioiSimulationSafetyService');

const SS_IDS = ['SS-01', 'SS-02', 'SS-03', 'SS-04', 'SS-05', 'SS-06', 'SS-07', 'SS-08'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P14.5 — Simulation Safety Audit\n');

  await test('SS-DOC: spec existe', () => assert(readDoc('AIOI_SIMULATION_SAFETY_SPECIFICATION.md')));
  await test('SS-01: validateSimulationSafety', () => assert(typeof safety.validateSimulationSafety === 'function'));

  for (const id of SS_IDS) {
    await test(`${id}: implementado`, () => assert(readSrc('services/aioi/aioiSimulationSafetyService.js').includes(`'${id}'`)));
  }

  await test('SS-09: validateSimulationSafety executa', async () => {
    const r = await safety.validateSimulationSafety();
    assert.strictEqual(r.total_checks, 8);
    assert.strictEqual(r.safety_valid, true);
    assert.strictEqual(r.pass_count, 8);
    assert.strictEqual(r.invariants.cognitive_execution_allowed, false);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
