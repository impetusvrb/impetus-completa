/**
 * AIOI-P15.3 — Runtime Validation Evidence Audit
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

const evidence = require('../../services/aioi/aioiRuntimeValidationEvidenceService');

const FIELDS = ['validation_id', 'evidence_chain', 'source_reviews', 'source_models', 'source_simulations', 'traceability_status'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P15.3 — Runtime Validation Evidence Audit\n');

  await test('RVE-DOC: spec existe', () => assert(readDoc('AIOI_RUNTIME_VALIDATION_EVIDENCE_SPECIFICATION.md')));
  await test('RVE-01: getRuntimeValidationEvidenceChains', () => assert(typeof evidence.getRuntimeValidationEvidenceChains === 'function'));

  for (const f of FIELDS) {
    await test(`RVE-FIELD: ${f}`, () => assert(readSrc('services/aioi/aioiRuntimeValidationEvidenceService.js').includes(f)));
  }

  await test('RVE-02: nenhuma sem evidência', () => assert(readSrc('services/aioi/aioiRuntimeValidationEvidenceService.js').includes('all_have_evidence')));

  await test('RVE-03: executa', async () => {
    const r = await evidence.getRuntimeValidationEvidenceChains();
    assert.strictEqual(r.total_validations, 9);
    assert(r.all_have_evidence);
    assert.strictEqual(r.traceable_count, r.total_validations);
    for (const chain of r.chains) {
      for (const f of FIELDS) assert(chain[f] !== undefined);
      assert.strictEqual(chain.traceability_status, 'TRACEABLE');
      assert(chain.evidence_chain.length > 0);
    }
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
