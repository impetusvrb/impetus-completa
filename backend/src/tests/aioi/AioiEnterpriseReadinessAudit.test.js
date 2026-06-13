/**
 * AIOI-P5.2 — Enterprise Readiness Audit
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');

function readDoc(n) { return fs.existsSync(path.join(DOCS, n)) ? fs.readFileSync(path.join(DOCS, n), 'utf8') : null; }
function readSrc(r) { return fs.existsSync(path.join(BACKEND_ROOT, 'src', r)) ? fs.readFileSync(path.join(BACKEND_ROOT, 'src', r), 'utf8') : null; }

const readiness = require('../../services/aioi/aioiEnterpriseReadinessService');

const EN_IDS = ['EN-01', 'EN-02', 'EN-03', 'EN-04', 'EN-05', 'EN-06', 'EN-07', 'EN-08'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P5.2 — Enterprise Readiness Audit\n');

  await test('EN-DOC: spec existe', () => assert(readDoc('AIOI_ENTERPRISE_READINESS_SPECIFICATION.md')));
  await test('EN-01: validateEnterpriseReadiness', () => assert(typeof readiness.validateEnterpriseReadiness === 'function'));

  for (const id of EN_IDS) {
    await test(`${id}: implementado`, () => assert(readSrc('services/aioi/aioiEnterpriseReadinessService.js').includes(`'${id}'`)));
  }

  await test('EN-09: invariants runtime', async () => {
    const r = await readiness.validateEnterpriseReadiness();
    assert.strictEqual(r.invariants.cognitive_execution_allowed, false);
  });

  await test('EN-10: enterprise_ready flag', async () => {
    const r = await readiness.validateEnterpriseReadiness();
    assert(typeof r.enterprise_ready === 'boolean');
    assert.strictEqual(r.total_checks, 8);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
