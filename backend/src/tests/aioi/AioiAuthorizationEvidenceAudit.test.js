/**
 * AIOI-P13.3 — Authorization Evidence Audit
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

const evidence = require('../../services/aioi/aioiAuthorizationEvidenceService');

const FIELDS = ['authorization_model_id', 'evidence_chain', 'supporting_reviews', 'supporting_recommendations', 'traceability_status'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P13.3 — Authorization Evidence Audit\n');

  await test('AE-DOC: spec existe', () => assert(readDoc('AIOI_AUTHORIZATION_EVIDENCE_SPECIFICATION.md')));
  await test('AE-01: getAuthorizationEvidenceChains', () => assert(typeof evidence.getAuthorizationEvidenceChains === 'function'));

  for (const f of FIELDS) {
    await test(`AE-FIELD: ${f}`, () => assert(readSrc('services/aioi/aioiAuthorizationEvidenceService.js').includes(f)));
  }

  await test('AE-02: nenhum sem evidência', () => assert(readSrc('services/aioi/aioiAuthorizationEvidenceService.js').includes('all_have_evidence')));

  await test('AE-03: executa', async () => {
    const r = await evidence.getAuthorizationEvidenceChains();
    assert.strictEqual(r.total_models, 7);
    assert(r.all_have_evidence);
    assert.strictEqual(r.traceable_count, r.total_models);
    for (const chain of r.chains) {
      for (const f of FIELDS) assert(chain[f] !== undefined);
      assert.strictEqual(chain.traceability_status, 'TRACEABLE');
      assert(chain.evidence_chain.length > 0);
    }
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
