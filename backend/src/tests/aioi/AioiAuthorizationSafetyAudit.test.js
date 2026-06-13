/**
 * AIOI-P13.5 — Authorization Safety Audit
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

const safety = require('../../services/aioi/aioiAuthorizationSafetyService');

const AS_IDS = ['AS-01', 'AS-02', 'AS-03', 'AS-04', 'AS-05', 'AS-06', 'AS-07', 'AS-08'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P13.5 — Authorization Safety Audit\n');

  await test('AS-DOC: spec existe', () => assert(readDoc('AIOI_AUTHORIZATION_SAFETY_SPECIFICATION.md')));
  await test('AS-01: validateAuthorizationSafety', () => assert(typeof safety.validateAuthorizationSafety === 'function'));

  for (const id of AS_IDS) {
    await test(`${id}: implementado`, () => assert(readSrc('services/aioi/aioiAuthorizationSafetyService.js').includes(`'${id}'`)));
  }

  await test('AS-09: validateAuthorizationSafety executa', async () => {
    const r = await safety.validateAuthorizationSafety();
    assert.strictEqual(r.total_checks, 8);
    assert.strictEqual(r.safety_valid, true);
    assert.strictEqual(r.pass_count, 8);
    assert.strictEqual(r.invariants.cognitive_execution_allowed, false);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
