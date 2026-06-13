/**
 * AIOI-P8.6 — Executive Readiness Audit
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');

function readDoc(n) { return fs.existsSync(path.join(DOCS, n)) ? fs.readFileSync(path.join(DOCS, n), 'utf8') : null; }
function readSrc(r) { return fs.existsSync(path.join(BACKEND_ROOT, 'src', r)) ? fs.readFileSync(path.join(BACKEND_ROOT, 'src', r), 'utf8') : null; }

const readiness = require('../../services/aioi/aioiExecutiveReadinessService');

const ERD_IDS = ['ERD-01', 'ERD-02', 'ERD-03', 'ERD-04', 'ERD-05', 'ERD-06', 'ERD-07', 'ERD-08'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P8.6 — Executive Readiness Audit\n');

  await test('ERD-DOC: spec existe', () => assert(readDoc('AIOI_EXECUTIVE_READINESS_SPECIFICATION.md')));
  await test('ERD-01: validateExecutiveReadiness', () => assert(typeof readiness.validateExecutiveReadiness === 'function'));

  for (const id of ERD_IDS) {
    await test(`${id}: implementado`, () => assert(readSrc('services/aioi/aioiExecutiveReadinessService.js').includes(`'${id}'`)));
  }

  await test('ERD-09: invariants runtime', async () => {
    const r = await readiness.validateExecutiveReadiness();
    assert.strictEqual(r.invariants.cognitive_execution_allowed, false);
  });

  await test('ERD-10: executive_readiness flag', async () => {
    const r = await readiness.validateExecutiveReadiness();
    assert(typeof r.executive_readiness === 'boolean');
    assert.strictEqual(r.total_checks, 8);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
