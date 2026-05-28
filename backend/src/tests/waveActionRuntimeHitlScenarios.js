'use strict';

/**
 * PROMPT 24 — Action Runtime + HITL scenarios (flags, policy, orchestrator health).
 */

const COMPANY_ID = '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';

let passed = 0;
let failed = 0;
const savedEnv = {};

function saveEnv(keys) {
  for (const k of keys) savedEnv[k] = process.env[k];
}

function restoreEnv(keys) {
  for (const k of keys) {
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

const ENV_KEYS = [
  'IMPETUS_ACTION_RUNTIME_MODE',
  'IMPETUS_ACTION_RUNTIME_ENABLED',
  'IMPETUS_ACTION_RUNTIME_PILOT_TENANTS',
  'OPERATIONAL_TOOL_CALLING_ENABLED',
  'OPERATIONAL_TOOL_SHADOW_MODE',
  'IMPETUS_ACTION_RUNTIME_REQUIRE_APPROVAL_ALL'
];

(async () => {
  console.log('\n══ ACTION RUNTIME + HITL (PROMPT 24) ══\n');
  saveEnv(ENV_KEYS);

  try {
    delete require.cache[require.resolve('../actionRuntime/config/actionRuntimeFlags')];
    delete require.cache[require.resolve('../actionRuntime/governance/actionToolPolicyRegistry')];
    delete require.cache[require.resolve('../actionRuntime/orchestration/actionRuntimeOrchestrator')];

    console.log('── Flags ──');
    process.env.IMPETUS_ACTION_RUNTIME_MODE = 'shadow';
    process.env.OPERATIONAL_TOOL_CALLING_ENABLED = 'true';
    process.env.IMPETUS_ACTION_RUNTIME_PILOT_TENANTS = COMPANY_ID;

    let flags = require('../actionRuntime/config/actionRuntimeFlags');
    assert('AR.1 shadow mode', flags.isShadowMode() === true);
    assert('AR.2 pilot tenant match', flags.isPilotTenant(COMPANY_ID) === true);
    assert('AR.3 should use runtime', flags.shouldUseActionRuntime(COMPANY_ID) === true);
    assert('AR.4 no real execution in shadow', flags.allowsRealExecution() === false);

    process.env.IMPETUS_ACTION_RUNTIME_MODE = 'audit';
    delete require.cache[require.resolve('../actionRuntime/config/actionRuntimeFlags')];
    flags = require('../actionRuntime/config/actionRuntimeFlags');
    assert('AR.5 audit mode', flags.isAuditMode() === true);

    console.log('\n── Policy / HITL ──');
    const policy = require('../actionRuntime/governance/actionToolPolicyRegistry');
    assert('AR.6 read tool no approval', policy.requiresApproval('consultar_tarefas') === false);
    assert('AR.7 write tool approval', policy.requiresApproval('criar_tarefa') === true);
    assert('AR.8 criar_tarefa rollback', policy.getToolPolicy('criar_tarefa').rollback_supported === true);

    console.log('\n── Explainability ──');
    const explain = require('../actionRuntime/explainability/actionExplainabilityService');
    const ex = explain.buildExplanation('criar_tarefa', { titulo: 'Teste HITL' }, { userId: 'u1', companyId: COMPANY_ID });
    assert('AR.9 explain summary', typeof ex.summary === 'string' && ex.summary.length > 0);

    console.log('\n── Health ──');
    const orch = require('../actionRuntime/orchestration/actionRuntimeOrchestrator');
    const health = orch.getHealth();
    assert('AR.10 health mode audit', health.mode === 'audit');
    assert('AR.11 policies listed', Array.isArray(health.policies) && health.policies.length >= 4);

    console.log('\n── DB tables (optional) ──');
    try {
      const db = require('../db');
      const t1 = await db.query(
        `SELECT COUNT(*)::int AS c FROM information_schema.tables WHERE table_name = 'ai_action_approval_queue'`
      );
      const t2 = await db.query(
        `SELECT COUNT(*)::int AS c FROM information_schema.tables WHERE table_name = 'ai_action_execution_traces'`
      );
      assert('AR.12 approval queue table', (t1.rows[0]?.c || 0) >= 1);
      assert('AR.13 execution traces table', (t2.rows[0]?.c || 0) >= 1);
    } catch (e) {
      console.log(`  ⚠️  DB skip: ${e?.message}`);
    }

    console.log('\n── Catálogo industrial (governance) ──');
    const catalog = require('../eventPipeline/catalog/industrialEventCatalog');
    assert('AR.16 domínio governance', catalog.DOMAINS.includes('governance'));
    assert(
      'AR.17 governance.action.executed',
      catalog.validateCatalogType('governance.action.executed').ok === true
    );
    assert(
      'AR.18 sem unknown_domain',
      catalog.validateCatalogType('governance.action.executed').reason !== 'unknown_domain'
    );

    console.log('\n── Shadow execute (no side effects) ──');
    process.env.IMPETUS_ACTION_RUNTIME_MODE = 'shadow';
    delete require.cache[require.resolve('../actionRuntime/config/actionRuntimeFlags')];
    delete require.cache[require.resolve('../actionRuntime/orchestration/actionRuntimeOrchestrator')];
    const orch2 = require('../actionRuntime/orchestration/actionRuntimeOrchestrator');
    const shadowRes = await orch2.executeToolCall(
      'criar_tarefa',
      { titulo: 'Shadow probe' },
      { companyId: COMPANY_ID, userId: null }
    );
    assert('AR.14 shadow flag on result', shadowRes.shadow === true);
    assert('AR.15 shadow trace_id', !!shadowRes.trace_id);
  } finally {
    restoreEnv(ENV_KEYS);
  }

  console.log(`\n══ Resultado: ${passed} passed, ${failed} failed ══\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
