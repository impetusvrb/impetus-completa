/**
 * AIOI-P10.4 — Observation Consistency Audit
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

const consistency = require('../../services/aioi/aioiObservationConsistencyService');

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P10.4 — Observation Consistency Audit\n');

  await test('OCN-DOC: spec existe', () => assert(readDoc('AIOI_OBSERVATION_CONSISTENCY_SPECIFICATION.md')));
  await test('OCN-01: validateObservationConsistency', () => assert(typeof consistency.validateObservationConsistency === 'function'));
  await test('OCN-02: sem correção automática', () => {
    assert(readSrc('services/aioi/aioiObservationConsistencyService.js').includes('auto_correction'));
  });

  await test('OCN-03: P6/P7/P8/P9 checks', () => {
    const c = readSrc('services/aioi/aioiObservationConsistencyService.js');
    assert(c.includes("'P6'") && c.includes("'P7'") && c.includes("'P8'") && c.includes("'P9'"));
  });

  await test('OCN-04: executa', async () => {
    const r = await consistency.validateObservationConsistency();
    assert.strictEqual(r.total_checks, 4);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
