/**
 * AIOI-P14.4 — Simulation Boundary Audit
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

const boundary = require('../../services/aioi/aioiSimulationBoundaryService');

const SB_IDS = ['SB-01', 'SB-02', 'SB-03', 'SB-04', 'SB-05', 'SB-06', 'SB-07', 'SB-08'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P14.4 — Simulation Boundary Audit\n');

  await test('SB-DOC: spec existe', () => assert(readDoc('AIOI_SIMULATION_BOUNDARY_SPECIFICATION.md')));
  await test('SB-01: validateSimulationBoundaries', () => assert(typeof boundary.validateSimulationBoundaries === 'function'));

  for (const id of SB_IDS) {
    await test(`${id}: implementado`, () => assert(readSrc('services/aioi/aioiSimulationBoundaryService.js').includes(`'${id}'`)));
  }

  await test('SB-09: validateSimulationBoundaries executa', async () => {
    const r = await boundary.validateSimulationBoundaries();
    assert.strictEqual(r.total_checks, 8);
    assert.strictEqual(r.boundaries_valid, true);
    assert.strictEqual(r.pass_count, 8);
    assert.strictEqual(r.text_violations.length, 0);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
