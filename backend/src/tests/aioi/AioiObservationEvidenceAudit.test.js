/**
 * AIOI-P10.3 — Observation Evidence Audit
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

const evidence = require('../../services/aioi/aioiObservationEvidenceService');

const FIELDS = ['observation_id', 'evidence_chain', 'traceability_status'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P10.3 — Observation Evidence Audit\n');

  await test('OE-DOC: spec existe', () => assert(readDoc('AIOI_OBSERVATION_EVIDENCE_SPECIFICATION.md')));
  await test('OE-01: getObservationEvidenceChains', () => assert(typeof evidence.getObservationEvidenceChains === 'function'));

  for (const f of FIELDS) {
    await test(`OE-FIELD: ${f}`, () => assert(readSrc('services/aioi/aioiObservationEvidenceService.js').includes(f)));
  }

  await test('OE-02: all_have_evidence', async () => {
    const r = await evidence.getObservationEvidenceChains();
    assert.strictEqual(r.all_have_evidence, true);
    assert(r.traceable_count >= 6);
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
