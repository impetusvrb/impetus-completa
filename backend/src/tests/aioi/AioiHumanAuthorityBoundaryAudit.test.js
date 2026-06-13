/**
 * AIOI-P12.4 — Human Authority Boundary Audit
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

const boundary = require('../../services/aioi/aioiHumanAuthorityBoundaryService');

const HAB_IDS = ['HAB-01', 'HAB-02', 'HAB-03', 'HAB-04', 'HAB-05', 'HAB-06', 'HAB-07', 'HAB-08'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P12.4 — Human Authority Boundary Audit\n');

  await test('HAB-DOC: spec existe', () => assert(readDoc('AIOI_HUMAN_AUTHORITY_BOUNDARY_SPECIFICATION.md')));
  await test('HAB-01: validateHumanAuthorityBoundaries', () => assert(typeof boundary.validateHumanAuthorityBoundaries === 'function'));

  for (const id of HAB_IDS) {
    await test(`${id}: implementado`, () => assert(readSrc('services/aioi/aioiHumanAuthorityBoundaryService.js').includes(`'${id}'`)));
  }

  await test('HAB-09: validateHumanAuthorityBoundaries executa', async () => {
    const r = await boundary.validateHumanAuthorityBoundaries();
    assert.strictEqual(r.total_checks, 8);
    assert.strictEqual(r.boundaries_valid, true);
    assert.strictEqual(r.pass_count, 8);
    assert.strictEqual(r.text_violations.length, 0);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
