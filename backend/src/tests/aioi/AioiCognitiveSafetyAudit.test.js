/**
 * AIOI-P9.5 — Cognitive Safety Audit
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

const safety = require('../../services/aioi/aioiCognitiveSafetyService');

const CS_IDS = ['CS-01', 'CS-02', 'CS-03', 'CS-04', 'CS-05', 'CS-06', 'CS-07', 'CS-08'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P9.5 — Cognitive Safety Audit\n');

  await test('CS-DOC: spec existe', () => assert(readDoc('AIOI_COGNITIVE_SAFETY_SPECIFICATION.md')));
  await test('CS-01: validateSafetyInvariants', () => assert(typeof safety.validateSafetyInvariants === 'function'));

  for (const id of CS_IDS) {
    await test(`${id}: implementado`, () => assert(readSrc('services/aioi/aioiCognitiveSafetyService.js').includes(`'${id}'`)));
  }

  await test('CS-09: validateSafetyInvariants executa', () => {
    const r = safety.validateSafetyInvariants();
    assert.strictEqual(r.total_checks, 8);
    assert(typeof r.safety_valid === 'boolean');
  });

  await test('CS-10: invariants runtime', () => {
    const r = safety.validateSafetyInvariants();
    assert.strictEqual(r.invariants.cognitive_execution_allowed, false);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
