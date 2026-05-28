'use strict';

/**
 * PROMPT 25 — Industrial Workflow Engine scenarios.
 */

const COMPANY_ID = '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';
const ENV_KEYS = ['IMPETUS_WORKFLOW_ENGINE_MODE', 'IMPETUS_WORKFLOW_ENGINE_PILOT_TENANTS'];

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
function assert(label, condition) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}

function clearCache() {
  for (const key of Object.keys(require.cache)) {
    if (key.includes('workflowEngine')) delete require.cache[key];
  }
}

(async () => {
  console.log('\n══ PROMPT 25 — INDUSTRIAL WORKFLOW ENGINE ══\n');
  saveEnv();

  try {
    process.env.IMPETUS_WORKFLOW_ENGINE_MODE = 'shadow';
    process.env.IMPETUS_WORKFLOW_ENGINE_PILOT_TENANTS = COMPANY_ID;
    clearCache();

    const flags = require('../workflowEngine/config/workflowEngineFlags');
    const bpmn = require('../workflowEngine/bpmn/bpmnDefinitionRegistry');
    const sm = require('../workflowEngine/stateMachine/stateMachineEngine');
    const catalog = require('../eventPipeline/catalog/industrialEventCatalog');

    assert('W25.1 shadow mode', flags.isShadowMode() === true);
    assert('W25.2 pilot tenant', flags.isPilotTenant(COMPANY_ID) === true);
    assert('W25.3 approval chain def', !!bpmn.getDefinition('governance.approval_chain.v1'));

    const def = bpmn.getDefinition('governance.approval_chain.v1');
    const t = sm.applyTransition(def, 'created', 'SUBMIT', {});
    assert('W25.4 deterministic SUBMIT', t.ok && t.deterministic === true);

    const bad = sm.applyTransition(def, 'completed', 'SUBMIT', {});
    assert('W25.5 invalid transition blocked', bad.ok === false);

    assert(
      'W25.6 catalog governance.workflow.started',
      catalog.validateCatalogType('governance.workflow.started').ok
    );

    const orch = require('../workflowEngine/orchestration/workflowOrchestrator');
    const shadowStart = await orch.startWorkflow({
      processKey: 'governance.approval_chain.v1',
      companyId: COMPANY_ID,
      userId: null,
      context: { test: true }
    });
    assert('W25.7 shadow start', shadowStart.shadow === true);

    console.log('\n── Persistência (audit) ──');
    const db = require('../db');
    process.env.IMPETUS_WORKFLOW_ENGINE_MODE = 'audit';
    clearCache();
    const orchAudit = require('../workflowEngine/orchestration/workflowOrchestrator');
    const start = await orchAudit.startWorkflow({
      processKey: 'governance.approval_chain.v1',
      companyId: COMPANY_ID,
      userId: null,
      context: { promo: 'audit' },
      correlationId: `wf-test-${Date.now()}`
    });
    assert('W25.8 audit instance created', !!start.instance_id);
    assert('W25.9 pending_approval state', start.current_state === 'pending_approval');

    const uid = (
      await db.query(
        `SELECT id FROM users WHERE company_id = $1::uuid AND hierarchy_level <= 4 LIMIT 1`,
        [COMPANY_ID]
      )
    ).rows[0]?.id;

    const pending = await require('../workflowEngine/hitl/approvalChainService').listPending(
      COMPANY_ID,
      5
    );
    const step = pending.find((p) => p.instance_id === start.instance_id);
    assert('W25.10 approval step exists', !!step);

    if (step && uid) {
      const appr = await orchAudit.approveWorkflowStep(step.id, COMPANY_ID, uid);
      assert('W25.11 audit approve no execute', appr.status === 'audit_approved_not_executed' || appr.audit_only === true);
    }

    const graph = await require('../workflowEngine/graph/executionGraphService').listGraph(
      start.instance_id,
      COMPANY_ID
    );
    assert('W25.12 execution graph nodes', graph.length >= 2);

    try {
      const t1 = await db.query(
        `SELECT COUNT(*)::int c FROM information_schema.tables WHERE table_name = 'industrial_workflow_instances'`
      );
      assert('W25.13 instances table', (t1.rows[0]?.c || 0) >= 1);
    } catch (e) {
      console.log(`  ⚠️  DB: ${e?.message}`);
    }
  } finally {
    restoreEnv();
    clearCache();
  }

  console.log(`\n══ Resultado: ${passed} passed, ${failed} failed ══\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
