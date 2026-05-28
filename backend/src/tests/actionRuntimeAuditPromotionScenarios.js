'use strict';

/**
 * Validação de promoção — fase audit (aprovação sem execução) + smoke on.
 */

const { v4: uuidv4 } = require('uuid');

const COMPANY_ID = '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';
const ENV_KEYS = [
  'IMPETUS_ACTION_RUNTIME_MODE',
  'OPERATIONAL_TOOL_CALLING_ENABLED',
  'IMPETUS_ACTION_RUNTIME_PILOT_TENANTS',
  'OPERATIONAL_TOOL_SHADOW_MODE'
];

let passed = 0;
let failed = 0;
const savedEnv = {};

function saveEnv() {
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
}

function restoreEnv() {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
}

function clearModuleCache() {
  const mods = [
    '../actionRuntime/config/actionRuntimeFlags',
    '../actionRuntime/orchestration/actionRuntimeOrchestrator',
    '../actionRuntime/hitl/approvalQueueService',
    '../actionRuntime/execution/actionExecutionTracer'
  ];
  for (const m of mods) {
    try {
      delete require.cache[require.resolve(m)];
    } catch (_e) {}
  }
}

function assert(label, condition) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}

async function countTasksWithTitle(db, title) {
  const r = await db.query(
    `SELECT COUNT(*)::int AS c FROM tasks WHERE company_id = $1::uuid AND title = $2`,
    [COMPANY_ID, title]
  );
  return r.rows[0]?.c || 0;
}

async function getTraceStatus(db, traceId) {
  const r = await db.query(
    `SELECT status, execution_result FROM ai_action_execution_traces WHERE trace_id = $1 AND company_id = $2::uuid`,
    [traceId, COMPANY_ID]
  );
  return r.rows[0] || null;
}

(async () => {
  console.log('\n══ ACTION RUNTIME — PROMOÇÃO (audit → on) ══\n');
  saveEnv();
  const db = require('../db');
  const uniqueTitle = `HITL-AUDIT-${Date.now()}`;
  let approvalId = null;
  let traceId = null;

  try {
    process.env.OPERATIONAL_TOOL_CALLING_ENABLED = 'true';
    process.env.OPERATIONAL_TOOL_SHADOW_MODE = 'false';
    process.env.IMPETUS_ACTION_RUNTIME_PILOT_TENANTS = COMPANY_ID;
    process.env.IMPETUS_ACTION_RUNTIME_MODE = 'audit';
    clearModuleCache();

    const flags = require('../actionRuntime/config/actionRuntimeFlags');
    const orch = require('../actionRuntime/orchestration/actionRuntimeOrchestrator');

    assert('P.1 modo audit', flags.isAuditMode() === true);
    assert('P.2 sem execução real em audit', flags.allowsRealExecution() === false);

    const beforeCount = await countTasksWithTitle(db, uniqueTitle);

    const proposed = await orch.executeToolCall(
      'criar_tarefa',
      { titulo: uniqueTitle, descricao: 'Validação promoção audit' },
      { companyId: COMPANY_ID, userId: null, conversationId: null }
    );

    assert('P.3 fila pending_approval', proposed.status === 'pending_approval');
    assert('P.4 approval_id presente', !!proposed.approval_id);
    approvalId = proposed.approval_id;
    traceId = proposed.trace_id;

    const approverId = (
      await db.query(
        `SELECT id FROM users WHERE company_id = $1::uuid AND hierarchy_level <= 4 LIMIT 1`,
        [COMPANY_ID]
      )
    ).rows[0]?.id;

    assert('P.5 utilizador aprovador existe', !!approverId);

    const approved = await orch.approveAndExecute(approvalId, COMPANY_ID, approverId);
    assert('P.6 audit_approved status', approved.status === 'audit_approved');
    assert('P.7 ok na aprovação audit', approved.ok === true);

    const trace = await getTraceStatus(db, traceId);
    assert('P.8 trace audit_approved_not_executed', trace?.status === 'audit_approved_not_executed');
    assert(
      'P.9 execution_result audit_only',
      trace?.execution_result?.audit_only === true || trace?.execution_result?.audit_only === 'true'
    );

    const afterCount = await countTasksWithTitle(db, uniqueTitle);
    assert('P.10 zero tarefas criadas em audit', afterCount === beforeCount && afterCount === 0);

    console.log('\n── Smoke modo on (execução pós-aprovação) ──');
    process.env.IMPETUS_ACTION_RUNTIME_MODE = 'on';
    clearModuleCache();
    const flagsOn = require('../actionRuntime/config/actionRuntimeFlags');
    const orchOn = require('../actionRuntime/orchestration/actionRuntimeOrchestrator');
    assert('P.11 modo on', flagsOn.allowsRealExecution() === true);

    const titleOn = `HITL-ON-${Date.now()}`;
    const prop2 = await orchOn.executeToolCall(
      'criar_tarefa',
      { titulo: titleOn, descricao: 'Smoke on pós-promoção' },
      { companyId: COMPANY_ID, userId: approverId, conversationId: null }
    );
    assert('P.12 segunda proposta pending', prop2.status === 'pending_approval');

    const appr2 = await orchOn.approveAndExecute(prop2.approval_id, COMPANY_ID, approverId);
    assert('P.13 executado em on', appr2.status === 'executed' || appr2.ok === true);

    const traceOn = await getTraceStatus(db, prop2.trace_id);
    assert('P.14 trace executed', traceOn?.status === 'executed');

    const onCount = await countTasksWithTitle(db, titleOn);
    assert('P.15 tarefa criada em on', onCount >= 1);

    if (traceOn?.execution_result?.task_id) {
      await db.query(
        `UPDATE tasks SET status = 'cancelled', updated_at = now() WHERE id = $1::uuid`,
        [traceOn.execution_result.task_id]
      );
      console.log('  🧹 tarefa smoke on cancelada (cleanup)');
    }
  } catch (err) {
    failed++;
    console.error('  ❌ Erro:', err?.message);
    console.error(err?.stack);
  } finally {
    if (approvalId) {
      try {
        await db.query(
          `UPDATE ai_action_approval_queue SET status = 'rejected', rejection_reason = 'test_cleanup', updated_at = now()
           WHERE id = $1::uuid AND status = 'pending'`,
          [approvalId]
        );
      } catch (_e) {}
    }
    restoreEnv();
    clearModuleCache();
  }

  console.log(`\n══ Resultado promoção: ${passed} passed, ${failed} failed ══\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
