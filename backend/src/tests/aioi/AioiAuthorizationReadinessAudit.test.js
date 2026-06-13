/**
 * AIOI-P13.6 — Authorization Readiness Audit
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

const readiness = require('../../services/aioi/aioiAuthorizationReadinessService');

const AR_IDS = ['AR-01', 'AR-02', 'AR-03', 'AR-04', 'AR-05', 'AR-06', 'AR-07', 'AR-08'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P13.6 — Authorization Readiness Audit\n');

  await test('AR-DOC: spec existe', () => assert(readDoc('AIOI_AUTHORIZATION_READINESS_SPECIFICATION.md')));
  await test('AR-01: validateAuthorizationReadiness', () => assert(typeof readiness.validateAuthorizationReadiness === 'function'));

  for (const id of AR_IDS) {
    await test(`${id}: implementado`, () => assert(readSrc('services/aioi/aioiAuthorizationReadinessService.js').includes(`'${id}'`)));
  }

  await test('AR-09: invariants runtime', async () => {
    const r = await readiness.validateAuthorizationReadiness();
    assert.strictEqual(r.invariants.cognitive_execution_allowed, false);
  });

  await test('AR-10: authorization_readiness flag', async () => {
    const r = await readiness.validateAuthorizationReadiness();
    assert(typeof r.authorization_readiness === 'boolean');
    assert.strictEqual(r.total_checks, 8);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
