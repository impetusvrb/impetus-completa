/**
 * AIOI-P1.1 — Workflow State Machine Certification Audit
 * Modo: UNIT + STATIC · ZERO RUNTIME COGNITIVO
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

const stateMachine = require('../../services/aioi/aioiWorkflowStateMachine');

let passed = 0, failed = 0;

async function test(label, fn) {
  try { await fn(); passed++; console.log(`  ✅  ${label}`); }
  catch (e) { failed++; console.error(`  ❌  ${label}\n       ${e.message}`); }
}

(async () => {
  console.log('\n  AIOI-P1.1 — Workflow State Certification Audit\n');

  await test('WF-DOC: AIOI_WORKFLOW_GOVERNANCE_CONTRACT.md intacto', () => {
    const d = readDoc('AIOI_WORKFLOW_GOVERNANCE_CONTRACT.md');
    assert(d && d.includes('OPEN') && d.includes('LEARNING'));
  });

  await test('WF-MOD: aioiWorkflowStateMachine.js existe', () => {
    assert(readSrc('services/aioi/aioiWorkflowStateMachine.js'));
  });

  await test('WF-01: OPEN → TRIAGED (open → triaged)', () => {
    assert(stateMachine.isValidTransition('open', 'triaged'));
    assert(!stateMachine.isForbiddenTransition('open', 'triaged'));
  });

  await test('WF-02: TRIAGED → PROPOSED (triaged → pending_approval)', () => {
    assert(stateMachine.isValidTransition('triaged', 'pending_approval'));
  });

  await test('WF-03: PROPOSED → APPROVED (pending_approval → approved)', () => {
    assert(stateMachine.isValidTransition('pending_approval', 'approved'));
  });

  await test('WF-04: APPROVED → EXECUTING (approved → in_progress)', () => {
    assert(stateMachine.isValidTransition('approved', 'in_progress'));
  });

  await test('WF-05: EXECUTING → COMPLETED (in_progress → resolved)', () => {
    assert(stateMachine.isValidTransition('in_progress', 'resolved'));
  });

  await test('WF-06: COMPLETED → LEARNING (resolved com learning_context — contrato ORG-5)', () => {
    const d = readDoc('AIOI_WORKFLOW_GOVERNANCE_CONTRACT.md');
    assert(d.includes('LEARNING'));
    assert(stateMachine.CANONICAL_TO_IOE.LEARNING === 'resolved');
  });

  await test('WF-BLOCK-01: OPEN → APPROVED proibido', () => {
    assert(stateMachine.isForbiddenTransition('open', 'approved'));
    assert(!stateMachine.isValidTransition('open', 'approved'));
  });

  await test('WF-BLOCK-02: OPEN → EXECUTING proibido', () => {
    assert(stateMachine.isForbiddenTransition('open', 'in_progress'));
  });

  await test('WF-BLOCK-03: OPEN → COMPLETED proibido', () => {
    assert(stateMachine.isForbiddenTransition('open', 'resolved'));
  });

  await test('WF-BLOCK-04: TRIAGED → EXECUTING proibido', () => {
    assert(stateMachine.isForbiddenTransition('triaged', 'in_progress'));
  });

  await test('WF-BLOCK-05: TRIAGED → COMPLETED proibido', () => {
    assert(stateMachine.isForbiddenTransition('triaged', 'resolved'));
  });

  await test('WF-BLOCK-06: PROPOSED → EXECUTING proibido', () => {
    assert(stateMachine.isForbiddenTransition('pending_approval', 'in_progress'));
  });

  await test('WF-ASSERT: assertValidTransition bloqueia transições inválidas', () => {
    const r = stateMachine.assertValidTransition('open', 'approved');
    assert(!r.ok && r.error.includes('FORBIDDEN'));
  });

  console.log(`\n  Resultado: ${passed} PASS · ${failed} FAIL\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
