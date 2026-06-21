'use strict';

/**
 * EVENT-GOVERNANCE-03 — testes da camada de execução real (flag-gated, dry-run default).
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(BACKEND_ROOT, 'src');

function readSrc(rel) {
  const p = path.join(SRC, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

let passed = 0;
let failed = 0;

async function test(label, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅  ${label}`);
  } catch (e) {
    failed++;
    console.error(`  ❌  ${label}\n       ${e.message}`);
  }
}

(async () => {
  console.log('\n  EVENT-GOVERNANCE-03\n');

  const registryPath = path.join(SRC, 'governance/executorRegistry.js');
  const execServicePath = path.join(SRC, 'services/eventGovernanceExecutionService.js');
  const auditSrc = readSrc('routes/audit.js');
  const observabilitySrc = readSrc('services/observabilityService.js');

  delete require.cache[require.resolve(registryPath)];
  delete require.cache[require.resolve(execServicePath)];

  const executorRegistry = require(registryPath);
  const execution = require(execServicePath);
  const { buildGovernanceDecisionDto } = require(path.join(SRC, 'governance/governanceDecisionDto.js'));

  executorRegistry.clearExecutorCacheForTests();
  execution.resetStatsForTests();

  const prevExecFlag = process.env.EVENT_GOVERNANCE_EXECUTION_ENABLED;
  delete process.env.EVENT_GOVERNANCE_EXECUTION_ENABLED;

  await test('T1 — executorRegistry exporta 5 executores', () => {
    assert.strictEqual(executorRegistry.getExecutorCount(), 5);
    const ids = executorRegistry.getExecutorDefinitions().map((d) => d.id);
    assert(ids.includes('notificationCenterExecutor'));
    assert(ids.includes('appImpetusExecutor'));
    assert(ids.includes('emailExecutor'));
    assert(ids.includes('dashboardExecutor'));
    assert(ids.includes('chatExecutor'));
  });

  await test('T2 — resolveExecutor carrega módulos', () => {
    for (const def of executorRegistry.getExecutorDefinitions()) {
      const mod = executorRegistry.resolveExecutor(def.id);
      assert(mod, `executor ${def.id} não resolvido`);
      assert(typeof mod.execute === 'function');
      assert.strictEqual(mod.EXECUTOR_ID, def.id);
    }
  });

  await test('T3 — executores reutilizam infra existente', () => {
    const ncSrc = readSrc('governance/executors/notificationCenterExecutor.js');
    const appSrc = readSrc('governance/executors/appImpetusExecutor.js');
    const emailSrc = readSrc('governance/executors/emailExecutor.js');
    const dashSrc = readSrc('governance/executors/dashboardExecutor.js');
    const chatSrc = readSrc('governance/executors/chatExecutor.js');

    assert(ncSrc.includes('unifiedMessagingService'));
    assert(ncSrc.includes('sendToUser'));
    assert(appSrc.includes('appImpetusService'));
    assert(appSrc.includes('sendMessage'));
    assert(emailSrc.includes('emailService'));
    assert(dashSrc.includes('operationalAlertsService'));
    assert(dashSrc.includes('createPlanningDerivedAlert'));
    assert(chatSrc.includes('chatService'));
    assert(chatSrc.includes('saveMessage'));
  });

  await test('T4 — dry-run default (flag off)', async () => {
    execution.resetStatsForTests();
    const decision = buildGovernanceDecisionDto({
      policyId: 'OPERATIONAL_CRITICAL',
      channels: ['notification_center', 'dashboard'],
      severity: 'high',
      escalationLevel: 2
    });
    const plan = execution.prepareExecution(decision);
    const result = await execution.executePlan({
      ...plan,
      companyId: '00000000-0000-0000-0000-000000000001',
      payload: {
        message: 'Teste dry-run governance',
        userId: '00000000-0000-0000-0000-000000000002',
        title: 'Alerta teste'
      }
    });

    assert.strictEqual(result.dryRun, true);
    assert.strictEqual(result.success, true);
    assert(result.channelsExecuted.includes('notification_center'));
    assert(result.channelsExecuted.includes('dashboard'));
    assert(result.executionPlan.every((s) => s.dryRun === true));
  });

  await test('T5 — executePlan rejeita plano não executável', async () => {
    const result = await execution.executePlan({
      executable: false,
      executionPlan: [],
      companyId: '00000000-0000-0000-0000-000000000001'
    });
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'plan_not_executable');
  });

  await test('T6 — execução real mockada (flag on)', async () => {
    process.env.EVENT_GOVERNANCE_EXECUTION_ENABLED = 'true';
    delete require.cache[require.resolve(registryPath)];
    delete require.cache[require.resolve(execServicePath)];

    const reg = require(registryPath);
    const origResolve = reg.resolveExecutor;
    reg.resolveExecutor = (id) => {
      if (id === 'notificationCenterExecutor') {
        return {
          EXECUTOR_ID: id,
          execute: async (ctx) => ({
            ok: true,
            executor: id,
            channel: 'notification_center',
            mocked: true,
            dryRun: ctx.dryRun
          })
        };
      }
      return origResolve(id);
    };

    const execSvc = require(execServicePath);
    execSvc.resetStatsForTests();

    const decision = buildGovernanceDecisionDto({
      policyId: 'OPERATIONAL_CRITICAL',
      channels: ['notification_center'],
      severity: 'critical'
    });
    const plan = execSvc.prepareExecution(decision);
    const result = await execSvc.executePlan({
      ...plan,
      companyId: '00000000-0000-0000-0000-000000000001',
      payload: { message: 'mock real', userId: '00000000-0000-0000-0000-000000000002' }
    });

    assert.strictEqual(result.dryRun, false);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.executionPlan[0].mocked, true);

    delete process.env.EVENT_GOVERNANCE_EXECUTION_ENABLED;
    delete require.cache[require.resolve(registryPath)];
    delete require.cache[require.resolve(execServicePath)];
  });

  await test('T7 — evaluatePrepareAndExecute pipeline completo', async () => {
    delete require.cache[require.resolve(execServicePath)];
    const execSvc = require(execServicePath);
    execSvc.resetStatsForTests();

    const result = await execSvc.evaluatePrepareAndExecute({
      companyId: '00000000-0000-0000-0000-000000000001',
      category: 'operational',
      severity: 'high',
      sourceModule: 'operationalAlertsService',
      payload: { message: 'Pipeline test', title: 'Ops' }
    });

    assert.strictEqual(result.evaluation.approved, true);
    assert.strictEqual(result.execution.executable, true);
    assert.strictEqual(result.execResult.dryRun, true);
    assert(result.execResult.success);
  });

  await test('T8 — observability métricas execution', () => {
    assert(observabilitySrc.includes('event_governance_execution_attempts'));
    assert(observabilitySrc.includes('event_governance_execution_success'));
    assert(observabilitySrc.includes('event_governance_execution_failures'));
    assert(observabilitySrc.includes('event_governance_execution_latency_ms'));
  });

  await test('T9 — GET /api/audit/event-governance/executors', () => {
    assert(auditSrc.includes('/event-governance/executors'));
    assert(auditSrc.includes('getExecutorsAuditStatus'));
    assert(auditSrc.includes('requireTenantAdminRole'));
  });

  await test('T10 — getExecutorsAuditStatus shape', () => {
    const st = execution.getExecutorsAuditStatus();
    assert.strictEqual(typeof st.enabled, 'boolean');
    assert.strictEqual(st.executors_registered, 5);
    assert.strictEqual(typeof st.executions, 'number');
    assert.strictEqual(typeof st.success, 'number');
    assert.strictEqual(typeof st.failures, 'number');
    assert.strictEqual(st.dry_run, !st.enabled);
  });

  await test('T11 — isExecutionEnabled default false', () => {
    delete process.env.EVENT_GOVERNANCE_EXECUTION_ENABLED;
    delete require.cache[require.resolve(execServicePath)];
    const mod = require(execServicePath);
    assert.strictEqual(mod.isExecutionEnabled(), false);
  });

  await test('T12 — feature flag EVENT_GOVERNANCE_EXECUTION_ENABLED registada', () => {
    const fgSrc = readSrc('services/featureGovernanceService.js');
    assert(fgSrc.includes('EVENT_GOVERNANCE_EXECUTION_ENABLED'));
  });

  await test('T13 — executePlan tenant-safe (companyId obrigatório)', async () => {
    const decision = buildGovernanceDecisionDto({
      policyId: 'DEFAULT_INFO',
      channels: ['dashboard'],
      severity: 'info'
    });
    const plan = execution.prepareExecution(decision);
    const result = await execution.executePlan({ ...plan, payload: { message: 'x' } });
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'companyId obrigatório');
  });

  await test('T14 — métricas incrementam após executePlan', async () => {
    execution.resetStatsForTests();
    const decision = buildGovernanceDecisionDto({
      policyId: 'BILLING_EMAIL_DAY3',
      channels: ['email'],
      severity: 'medium'
    });
    const plan = execution.prepareExecution(decision);
    await execution.executePlan({
      ...plan,
      companyId: '00000000-0000-0000-0000-000000000001',
      payload: { message: 'billing test', to: 'admin@example.com', subject: 'Test' }
    });
    const st = execution.getExecutorsAuditStatus();
    assert(st.executions >= 1);
    assert(st.success >= 1);
  });

  if (prevExecFlag !== undefined) {
    process.env.EVENT_GOVERNANCE_EXECUTION_ENABLED = prevExecFlag;
  } else {
    delete process.env.EVENT_GOVERNANCE_EXECUTION_ENABLED;
  }

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log(JSON.stringify({ passed, failed }));
})();
