/**
 * AIOI-P11.3 — Recommendation Evidence Audit
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

const evidence = require('../../services/aioi/aioiRecommendationEvidenceService');

const FIELDS = ['recommendation_id', 'evidence_chain', 'supporting_observations', 'traceability_status'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P11.3 — Recommendation Evidence Audit\n');

  await test('RE-DOC: spec existe', () => assert(readDoc('AIOI_RECOMMENDATION_EVIDENCE_SPECIFICATION.md')));
  await test('RE-01: getRecommendationEvidenceChains', () => assert(typeof evidence.getRecommendationEvidenceChains === 'function'));

  for (const f of FIELDS) {
    await test(`RE-FIELD: ${f}`, () => assert(readSrc('services/aioi/aioiRecommendationEvidenceService.js').includes(f)));
  }

  await test('RE-02: nenhuma sem evidência', () => assert(readSrc('services/aioi/aioiRecommendationEvidenceService.js').includes('all_have_evidence')));

  await test('RE-03: executa', async () => {
    const r = await evidence.getRecommendationEvidenceChains();
    assert(r.chains.length >= 6);
    assert(r.all_have_evidence);
    assert.strictEqual(r.traceable_count, r.total_recommendations);
    for (const chain of r.chains) {
      for (const f of FIELDS) assert(chain[f] !== undefined);
      assert.strictEqual(chain.traceability_status, 'TRACEABLE');
      assert(chain.evidence_chain.length > 0);
    }
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
