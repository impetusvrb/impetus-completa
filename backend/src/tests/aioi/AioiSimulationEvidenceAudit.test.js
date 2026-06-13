/**
 * AIOI-P14.3 — Simulation Evidence Audit
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

const evidence = require('../../services/aioi/aioiSimulationEvidenceService');

const FIELDS = ['simulation_id', 'evidence_chain', 'source_observations', 'source_recommendations', 'source_reviews', 'source_models', 'traceability_status'];

let passed = 0, failed = 0;
async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P14.3 — Simulation Evidence Audit\n');

  await test('SE-DOC: spec existe', () => assert(readDoc('AIOI_SIMULATION_EVIDENCE_SPECIFICATION.md')));
  await test('SE-01: getSimulationEvidenceChains', () => assert(typeof evidence.getSimulationEvidenceChains === 'function'));

  for (const f of FIELDS) {
    await test(`SE-FIELD: ${f}`, () => assert(readSrc('services/aioi/aioiSimulationEvidenceService.js').includes(f)));
  }

  await test('SE-02: nenhuma sem evidência', () => assert(readSrc('services/aioi/aioiSimulationEvidenceService.js').includes('all_have_evidence')));

  await test('SE-03: executa', async () => {
    const r = await evidence.getSimulationEvidenceChains();
    assert.strictEqual(r.total_simulations, 7);
    assert(r.all_have_evidence);
    assert.strictEqual(r.traceable_count, r.total_simulations);
    for (const chain of r.chains) {
      for (const f of FIELDS) assert(chain[f] !== undefined);
      assert.strictEqual(chain.traceability_status, 'TRACEABLE');
      assert(chain.evidence_chain.length > 0);
    }
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
