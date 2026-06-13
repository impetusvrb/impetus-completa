/**
 * AIOI-P15.4 — Runtime Boundary Audit
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

const boundary = require('../../services/aioi/aioiRuntimeBoundaryService');

const RBV_IDS = ['RBV-01', 'RBV-02', 'RBV-03', 'RBV-04', 'RBV-05', 'RBV-06', 'RBV-07', 'RBV-08'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P15.4 — Runtime Boundary Audit\n');

  await test('RBV-DOC: spec existe', () => assert(readDoc('AIOI_RUNTIME_BOUNDARY_SPECIFICATION.md')));
  await test('RBV-01: validateRuntimeBoundaries', () => assert(typeof boundary.validateRuntimeBoundaries === 'function'));

  for (const id of RBV_IDS) {
    await test(`${id}: implementado`, () => assert(readSrc('services/aioi/aioiRuntimeBoundaryService.js').includes(`'${id}'`)));
  }

  await test('RBV-09: validateRuntimeBoundaries executa', async () => {
    const r = await boundary.validateRuntimeBoundaries();
    assert.strictEqual(r.total_checks, 8);
    assert.strictEqual(r.boundaries_valid, true);
    assert.strictEqual(r.pass_count, 8);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
