/**
 * AIOI-P4.6 — Extended Pilot Readiness Audit
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');

function readDoc(n) { return fs.existsSync(path.join(DOCS, n)) ? fs.readFileSync(path.join(DOCS, n), 'utf8') : null; }

const readiness = require('../../services/aioi/aioiExtendedPilotReadinessService');

const ER_IDS = ['ER-01', 'ER-02', 'ER-03', 'ER-04', 'ER-05', 'ER-06', 'ER-07', 'ER-08'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P4.6 — Extended Pilot Readiness Audit\n');

  await test('ER-DOC: spec existe', () => assert(readDoc('AIOI_EXTENDED_PILOT_READINESS_SPECIFICATION.md')));
  await test('ER-01: validateExtendedPilotReadiness', () => assert(typeof readiness.validateExtendedPilotReadiness === 'function'));

  for (const id of ER_IDS) {
    await test(`${id}: implementado`, async () => {
      const r = await readiness.validateExtendedPilotReadiness();
      assert(r.checks.find(c => c.id === id), `${id} ausente`);
    });
  }

  await test('ER-09: invariants runtime', async () => {
    const r = await readiness.validateExtendedPilotReadiness();
    assert.strictEqual(r.invariants.cognitive_execution_allowed, false);
    assert.strictEqual(r.invariants.runtime_enabled, false);
  });

  await test('ER-10: extended_pilot_ready flag', async () => {
    const r = await readiness.validateExtendedPilotReadiness();
    assert(typeof r.extended_pilot_ready === 'boolean');
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
