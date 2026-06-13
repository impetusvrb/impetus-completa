/**
 * AIOI-P3.2 — Pilot Validation Audit (PV-01..PV-10)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const SRC = path.join(BACKEND_ROOT, 'src');

function readDoc(n) { const p = path.join(DOCS, n); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }
function readSrc(r) { const p = path.join(SRC, r); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }
function stripComments(c) { return c.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//')).join('\n'); }

const PIPELINE = [
  { id: 'PV-01', label: 'IOE ingestão', file: 'services/aioi/aioiEventIngestionService.js', checks: ['correlation_id', 'truth_state', 'evidence_refs'] },
  { id: 'PV-02', label: 'Outbox consumer', file: 'services/aioi/aioiOutboxConsumerService.js', checks: ['pickBatch', 'markDelivered', 'FOR UPDATE SKIP LOCKED'] },
  { id: 'PV-03', label: 'Classification', file: 'services/aioi/aioiClassificationConsumerService.js', checks: ['classifyIoe', 'open', 'triaged'] },
  { id: 'PV-04', label: 'Decision bridge', file: 'services/aioi/aioiDecisionBridgeService.js', checks: ['decision_type', 'decision_payload'] },
  { id: 'PV-05', label: 'Execution bridge', file: 'services/aioi/aioiExecutionBridgeService.js', checks: ['validateExecutionEligibility', 'approved_by_user_id'] },
  { id: 'PV-06', label: 'Outcome tracking', file: 'services/aioi/aioiOutcomeTrackingService.js', checks: ['aioi_outcome'] },
  { id: 'PV-07', label: 'Learning bridge', file: 'services/aioi/aioiLearningBridgeService.js', checks: ['operationalLearningService', 'resolved'] }
];

let passed = 0, failed = 0;

async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P3.2 — Pilot Validation Audit\n');

  await test('PV-DOC: AIOI_PILOT_VALIDATION_CONTRACT.md', () => {
    const d = readDoc('AIOI_PILOT_VALIDATION_CONTRACT.md');
    assert(d && d.includes('PV-01'));
  });

  for (const stage of PIPELINE) {
    await test(`${stage.id}: ${stage.label} — ficheiro existe`, () => {
      assert(readSrc(stage.file), `MISSING: ${stage.file}`);
    });
    for (const check of stage.checks) {
      await test(`${stage.id}: ${stage.label} — ${check}`, () => {
        const c = readSrc(stage.file);
        assert(c.includes(check), `${check} ausente em ${stage.file}`);
      });
    }
  }

  await test('PV-08: Evidence chain P1 intacta', () => {
    assert(fs.existsSync(path.join(__dirname, 'AioiOperationalEvidenceChainAudit.test.js')));
    const d = readDoc('AIOI_P1_OPERATIONAL_ROLLOUT_CERTIFICATION_REPORT.md');
    assert(d.includes('OPERATIONAL_EVIDENCE_CHAIN_CERTIFIED'));
  });

  await test('PV-09: truth_state nos bridges', () => {
    for (const f of ['aioiExecutionPayloadBuilder.js', 'aioiOutcomePayloadBuilder.js', 'aioiLearningPayloadBuilder.js']) {
      assert(readSrc(`services/aioi/${f}`).includes('truth_state'));
    }
  });

  await test('PV-10: correlation_id na cadeia', () => {
    for (const f of ['aioiEventIngestionService.js', 'aioiExecutionBridgeService.js', 'aioiLearningBridgeService.js']) {
      assert(readSrc(`services/aioi/${f}`).includes('correlation_id'));
    }
  });

  await test('PV-11: Sem LLM no pipeline', () => {
    for (const stage of PIPELINE) {
      const c = stripComments(readSrc(stage.file)).toLowerCase();
      assert(!c.includes('openai') && !c.includes('gemini') && !c.includes('anthropic'), stage.file);
    }
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
