/**
 * AIOI-P12.3 — Human Review Evidence Audit
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

const evidence = require('../../services/aioi/aioiHumanReviewEvidenceService');

const FIELDS = ['assistance_id', 'evidence_chain', 'recommendation_ids', 'observation_ids', 'traceability_status'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P12.3 — Human Review Evidence Audit\n');

  await test('HRE-DOC: spec existe', () => assert(readDoc('AIOI_HUMAN_REVIEW_EVIDENCE_SPECIFICATION.md')));
  await test('HRE-01: getHumanReviewEvidenceChains', () => assert(typeof evidence.getHumanReviewEvidenceChains === 'function'));

  for (const f of FIELDS) {
    await test(`HRE-FIELD: ${f}`, () => assert(readSrc('services/aioi/aioiHumanReviewEvidenceService.js').includes(f)));
  }

  await test('HRE-02: nenhum sem evidência', () => assert(readSrc('services/aioi/aioiHumanReviewEvidenceService.js').includes('all_have_evidence')));

  await test('HRE-03: executa', async () => {
    const r = await evidence.getHumanReviewEvidenceChains();
    assert(r.chains.length >= 6);
    assert(r.all_have_evidence);
    assert.strictEqual(r.traceable_count, r.total_packages);
    for (const chain of r.chains) {
      for (const f of FIELDS) assert(chain[f] !== undefined);
      assert.strictEqual(chain.traceability_status, 'TRACEABLE');
      assert(chain.evidence_chain.length > 0);
    }
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
