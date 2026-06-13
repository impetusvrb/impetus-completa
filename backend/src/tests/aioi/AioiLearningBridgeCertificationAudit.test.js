/**
 * AIOI-P1.2 — Learning Bridge Certification Audit
 * Modo: STATIC + UNIT · ZERO RUNTIME COGNITIVO
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

const learningPayloadBuilder = require('../../services/aioi/aioiLearningPayloadBuilder');

let passed = 0, failed = 0;

async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

const learningContext = {
  company_id: '22222222-2222-4222-8222-222222222222',
  machine_id: 'eq-1',
  action_type: 'aioi_workflow',
  success: true,
  context_tag: 'failure',
  correlation_id: 'corr-lrn',
  external_ref_id: 'ext-lrn',
  truth_state: 'grounded',
  evidence_refs: [{ type: 'outcome', ref: 'o1' }],
  outcome_status: 'success',
  execution_reference: { type: 'workflow', ref_id: 'wf-1', correlation_id: 'corr-lrn' }
};

(async () => {
  console.log('\n  AIOI-P1.2 — Learning Bridge Certification Audit\n');

  await test('PC-LRN-DOC: AIOI_LEARNING_BRIDGE_CERTIFICATION.md existe', () => {
    assert(readDoc('AIOI_LEARNING_BRIDGE_CERTIFICATION.md'));
  });

  await test('PC-LRN-01: Somente status=resolved elegível', () => {
    const svc = readSrc('services/aioi/aioiLearningBridgeService.js');
    assert(svc.includes("status !== 'resolved'") || svc.includes("status     = 'resolved'"));
    assert(svc.includes("AND status = 'resolved'"));
  });

  await test('PC-LRN-02: Outcome obrigatório (learning_context)', () => {
    const r = learningPayloadBuilder.validateLearningPayload(null);
    assert(!r.ok && r.reason === 'LEARNING_CONTEXT_REQUIRED');
    const svc = readSrc('services/aioi/aioiLearningBridgeService.js');
    assert(svc.includes('LEARNING_CONTEXT_REQUIRED'));
  });

  await test('PC-LRN-03: correlation_id preservado no payload', () => {
    const p = learningPayloadBuilder.buildLearningPayload(learningContext);
    assert.strictEqual(p.action.correlation_id, 'corr-lrn');
    assert.strictEqual(p.result.correlation_id, 'corr-lrn');
  });

  await test('PC-LRN-04: evidence_refs preservados', () => {
    const p = learningPayloadBuilder.buildLearningPayload(learningContext);
    assert(Array.isArray(p.action.evidence_refs) && p.action.evidence_refs.length === 1);
    assert(Array.isArray(p.result.evidence_refs) && p.result.evidence_refs.length === 1);
  });

  await test('PC-LRN-05: truth_state preservado', () => {
    const p = learningPayloadBuilder.buildLearningPayload(learningContext);
    assert.strictEqual(p.action.truth_state, 'grounded');
    assert.strictEqual(p.result.truth_state, 'grounded');
  });

  await test('PC-LRN-06: Sem aprendizado autônomo (sem worker/cron no bridge)', () => {
    const svc = stripComments(readSrc('services/aioi/aioiLearningBridgeService.js'));
    assert(!svc.includes('setInterval') && !svc.includes('setTimeout'));
    assert(!svc.includes('pm2'));
  });

  await test('PC-LRN-07: Sem ajuste de pesos', () => {
    const files = ['aioiLearningBridgeService.js', 'aioiLearningPayloadBuilder.js'];
    for (const f of files) {
      const c = stripComments(readSrc(`services/aioi/${f}`)).toLowerCase();
      assert(!c.includes('updateweight') && !c.includes('adjustweight') && !c.includes('fit('));
    }
  });

  await test('PC-LRN-08: Sem weight_versions', () => {
    const files = ['aioiLearningBridgeService.js', 'aioiLearningPayloadBuilder.js'];
    for (const f of files) {
      const c = readSrc(`services/aioi/${f}`).toLowerCase();
      assert(!c.includes('weight_version') && !c.includes('aioi_weight'));
    }
  });

  await test('PC-LRN-09: Sem rerank', () => {
    const files = ['aioiLearningBridgeService.js', 'aioiLearningPayloadBuilder.js'];
    for (const f of files) {
      const c = stripComments(readSrc(`services/aioi/${f}`)).toLowerCase();
      assert(!c.includes('rerank') && !c.includes('gemini'));
    }
  });

  await test('PC-LRN-10: Delegação exclusiva operationalLearningService', () => {
    const svc = readSrc('services/aioi/aioiLearningBridgeService.js');
    assert(svc.includes('operationalLearningService'));
    assert(svc.includes('recordOperationalOutcome'));
    const code = stripComments(svc);
    assert(!code.includes('operationalDecisionEngine'));
    assert(!code.includes('workflowOrchestrator'));
  });

  await test('PC-LRN-11: SQL fetch inclui truth_state, evidence_refs, external_ref_id', () => {
    const svc = readSrc('services/aioi/aioiLearningBridgeService.js');
    assert(svc.includes('truth_state'));
    assert(svc.includes('evidence_refs'));
    assert(svc.includes('external_ref_id'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
