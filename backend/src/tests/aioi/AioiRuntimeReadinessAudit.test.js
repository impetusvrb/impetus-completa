/**
 * AIOI-P15.6 — Runtime Readiness Audit
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

const readiness = require('../../services/aioi/aioiRuntimeReadinessService');

const RRV_IDS = ['RRV-01', 'RRV-02', 'RRV-03', 'RRV-04', 'RRV-05', 'RRV-06', 'RRV-07', 'RRV-08'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P15.6 — Runtime Readiness Audit\n');

  await test('RRV-DOC: spec existe', () => assert(readDoc('AIOI_RUNTIME_READINESS_SPECIFICATION.md')));
  await test('RRV-01: validateRuntimeReadiness', () => assert(typeof readiness.validateRuntimeReadiness === 'function'));

  for (const id of RRV_IDS) {
    await test(`${id}: implementado`, () => assert(readSrc('services/aioi/aioiRuntimeReadinessService.js').includes(`'${id}'`)));
  }

  await test('RRV-09: invariants runtime', async () => {
    const r = await readiness.validateRuntimeReadiness();
    assert.strictEqual(r.invariants.cognitive_execution_allowed, false);
    assert.strictEqual(r.invariants.runtime_enabled, false);
  });

  await test('RRV-10: runtime_readiness flag', async () => {
    const r = await readiness.validateRuntimeReadiness();
    assert(typeof r.runtime_readiness === 'boolean');
    assert.strictEqual(r.total_checks, 8);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
