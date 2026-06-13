/**
 * AIOI-P14.6 — Simulation Readiness Audit
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

const readiness = require('../../services/aioi/aioiSimulationReadinessService');

const SR_IDS = ['SR-01', 'SR-02', 'SR-03', 'SR-04', 'SR-05', 'SR-06', 'SR-07', 'SR-08'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P14.6 — Simulation Readiness Audit\n');

  await test('SR-DOC: spec existe', () => assert(readDoc('AIOI_SIMULATION_READINESS_SPECIFICATION.md')));
  await test('SR-01: validateSimulationReadiness', () => assert(typeof readiness.validateSimulationReadiness === 'function'));

  for (const id of SR_IDS) {
    await test(`${id}: implementado`, () => assert(readSrc('services/aioi/aioiSimulationReadinessService.js').includes(`'${id}'`)));
  }

  await test('SR-09: invariants runtime', async () => {
    const r = await readiness.validateSimulationReadiness();
    assert.strictEqual(r.invariants.cognitive_execution_allowed, false);
  });

  await test('SR-10: simulation_readiness flag', async () => {
    const r = await readiness.validateSimulationReadiness();
    assert(typeof r.simulation_readiness === 'boolean');
    assert.strictEqual(r.total_checks, 8);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
