/**
 * AIOI-P1.0 — Execution Bridge Certification Audit
 * Modo: STATIC + UNIT (validateExecutionEligibility) · ZERO RUNTIME COGNITIVO
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

const executionBridge = require('../../services/aioi/aioiExecutionBridgeService');
const payloadBuilder = require('../../services/aioi/aioiExecutionPayloadBuilder');

let passed = 0, failed = 0;

async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

const approvedIoe = {
  status: 'approved',
  approved_by_user_id: '11111111-1111-4111-8111-111111111111',
  approved_at: new Date().toISOString(),
  decision_type: 'workflow',
  decision_payload: { recommendation: 'test' },
  company_id: '22222222-2222-4222-8222-222222222222',
  correlation_id: 'corr-1',
  external_ref_id: 'ext-1',
  truth_state: 'grounded',
  evidence_refs: [{ type: 'sensor', ref: 's1' }],
  category: 'equipment_failure',
  id: '33333333-3333-4333-8333-333333333333'
};

(async () => {
  console.log('\n  AIOI-P1.0 — Execution Bridge Certification Audit\n');

  await test('PC-EXE-DOC: AIOI_EXECUTION_BRIDGE_CERTIFICATION.md existe', () => {
    assert(readDoc('AIOI_EXECUTION_BRIDGE_CERTIFICATION.md'));
  });

  await test('PC-EXE-01: Execution exige approved_by_user_id', () => {
    const r = executionBridge.validateExecutionEligibility({ ...approvedIoe, approved_by_user_id: null });
    assert(!r.ok && r.error === 'HITL_REQUIRED');
  });

  await test('PC-EXE-02: Execution exige approved_at', () => {
    const r = executionBridge.validateExecutionEligibility({ ...approvedIoe, approved_at: null });
    assert(!r.ok && r.error === 'HITL_REQUIRED');
  });

  await test('PC-EXE-03: Execution exige status=approved', () => {
    const r = executionBridge.validateExecutionEligibility({ ...approvedIoe, status: 'in_progress' });
    assert(!r.ok);
  });

  await test('PC-EXE-04: Proibido executar open/triaged/pending_approval', () => {
    for (const s of ['open', 'triaged', 'pending_approval']) {
      const r = executionBridge.validateExecutionEligibility({ ...approvedIoe, status: s });
      assert(!r.ok && r.error === 'EXECUTION_BLOCKED_STATUS', `status ${s} deveria bloquear`);
    }
  });

  await test('PC-EXE-05: Payload preserva truth_state, evidence_refs, correlation_id, external_ref_id', () => {
    const wf = payloadBuilder.buildWorkflowPayload(approvedIoe);
    assert.strictEqual(wf.correlationId, 'corr-1');
    assert.strictEqual(wf.context.truth_state, 'grounded');
    assert.strictEqual(wf.context.external_ref_id, 'ext-1');
    assert.strictEqual(wf.context.correlation_id, 'corr-1');
    assert(Array.isArray(wf.context.evidence_refs) && wf.context.evidence_refs.length === 1);

    const act = payloadBuilder.buildActionPayload({ ...approvedIoe, decision_type: 'direct_action' });
    assert.strictEqual(act.ctx.correlation_id, 'corr-1');
    assert.strictEqual(act.ctx.truth_state, 'grounded');
    assert.strictEqual(act.ctx.external_ref_id, 'ext-1');
    assert(Array.isArray(act.ctx.evidence_refs));
  });

  await test('PC-EXE-06: Sem bypass HITL — fetch exige approved + HITL fields', () => {
    const svc = readSrc('services/aioi/aioiExecutionBridgeService.js');
    assert(svc.includes("status = 'approved'"));
    assert(svc.includes('approved_by_user_id IS NOT NULL'));
    assert(svc.includes('approved_at IS NOT NULL'));
  });

  await test('PC-EXE-07: Delegação exclusiva workflowOrchestrator / actionRuntimeOrchestrator', () => {
    const svc = stripComments(readSrc('services/aioi/aioiExecutionBridgeService.js'));
    assert(svc.includes('workflowOrchestrator'));
    assert(svc.includes('actionRuntimeOrchestrator'));
    assert(!svc.includes('operationalDecisionEngine'));
    assert(!svc.includes('operationalLearningService'));
  });

  await test('PC-EXE-08: Sem LLM no execution bridge', () => {
    const files = ['aioiExecutionBridgeService.js', 'aioiExecutionPayloadBuilder.js'];
    for (const f of files) {
      const c = stripComments(readSrc(`services/aioi/${f}`)).toLowerCase();
      assert(!c.includes('openai') && !c.includes('anthropic') && !c.includes('gemini'));
    }
  });

  await test('PC-EXE-09: SQL fetch inclui truth_state, evidence_refs, external_ref_id', () => {
    const svc = readSrc('services/aioi/aioiExecutionBridgeService.js');
    assert(svc.includes('truth_state'));
    assert(svc.includes('evidence_refs'));
    assert(svc.includes('external_ref_id'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
