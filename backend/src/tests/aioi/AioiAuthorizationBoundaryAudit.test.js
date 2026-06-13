/**
 * AIOI-P13.4 — Authorization Boundary Audit
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

const boundary = require('../../services/aioi/aioiAuthorizationBoundaryService');

const AB_IDS = ['AB-01', 'AB-02', 'AB-03', 'AB-04', 'AB-05', 'AB-06', 'AB-07', 'AB-08'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P13.4 — Authorization Boundary Audit\n');

  await test('AB-DOC: spec existe', () => assert(readDoc('AIOI_AUTHORIZATION_BOUNDARY_SPECIFICATION.md')));
  await test('AB-01: validateAuthorizationBoundaries', () => assert(typeof boundary.validateAuthorizationBoundaries === 'function'));

  for (const id of AB_IDS) {
    await test(`${id}: implementado`, () => assert(readSrc('services/aioi/aioiAuthorizationBoundaryService.js').includes(`'${id}'`)));
  }

  await test('AB-09: validateAuthorizationBoundaries executa', async () => {
    const r = await boundary.validateAuthorizationBoundaries();
    assert.strictEqual(r.total_checks, 8);
    assert.strictEqual(r.boundaries_valid, true);
    assert.strictEqual(r.pass_count, 8);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
