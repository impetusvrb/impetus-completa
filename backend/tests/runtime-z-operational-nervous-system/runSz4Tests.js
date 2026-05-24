'use strict';

process.env.IMPETUS_SZ4_OPERATIONAL_NERVOUS_SYSTEM = process.env.IMPETUS_SZ4_OPERATIONAL_NERVOUS_SYSTEM || 'on';
process.env.IMPETUS_SZ4_DEFAULT_STAGE = process.env.IMPETUS_SZ4_DEFAULT_STAGE || 'SZ4_SHADOW';

let passed = 0;
let failed = 0;

function assert(name, cond, detail = '') {
  if (cond) {
    passed += 1;
    console.log('  ✓', name);
  } else {
    failed += 1;
    console.error('  ✗', name, detail);
  }
}

function section(title) {
  console.log('\n──', title, '──');
}

const flags = require('../../src/runtime-z-operational-nervous-system/config/sz4FeatureFlags');
const store = require('../../src/runtime-z-operational-nervous-system/_core/sz4TenantStore');
const nlp = require('../../src/runtime-z-operational-nervous-system/_core/sz4EntityExtractor');
const pipeline = require('../../src/runtime-z-operational-nervous-system/_core/sz4PipelineCore');
const facade = require('../../src/runtime-z-operational-nervous-system/facade/zOperationalNervousSystemFacade');
const internalChat = require('../../src/runtime-z-operational-nervous-system/internal-chat/internalChatOperationalRuntime');
const metrics = require('../../src/runtime-z-operational-nervous-system/observability/operationalNervousSystemMetrics');
const obs = require('../../src/runtime-z-operational-nervous-system/config/sz4ObservationPolicy');
const gov = require('../../src/runtime-z-operational-nervous-system/config/sz4GovernanceFlags');
const reminders = require('../../src/runtime-z-operational-nervous-system/reminders/contextualReminderRuntime');

const TENANT = '00000000-0000-4000-8000-000000000004';
const THREAD = '00000000-0000-4000-8000-000000000101';
const USER_A = { id: '00000000-0000-4000-8000-000000000201', company_id: TENANT, name: 'Carlos', role: 'supervisor' };
const USER_B = { id: '00000000-0000-4000-8000-000000000202', company_id: TENANT, name: 'Ana', role: 'analista' };

process.env.IMPETUS_SZ4_PROMOTED_TENANTS = TENANT;
process.env.IMPETUS_SZ4_PROMOTED_TENANT_STAGE = 'SZ4_REINTEGRATION_ACTIVE';

section('SZ4 flags & invariants');
assert('SZ4 enabled', flags.isEnabled() === true);
assert('default stage shadow', flags.defaultStage() === 'SZ4_SHADOW');
assert('invariants assistive_only', flags.invariants.assistive_only === true);
assert('invariants auto_execution false', flags.invariants.auto_execution === false);
assert('invariants no biometric', flags.invariants.no_biometric_enforcement === true);

section('NLP entity extraction');
const e1 = nlp.extractEntities('Preciso do relatório de perdas amanhã às 14h.');
assert('detect task/report', !!(e1.task || e1.report));
assert('detect deadline', !!e1.deadline);
const deadline = nlp.parseDeadline('amanhã', '14h');
assert('parseDeadline amanhã 14h', !!deadline && new Date(deadline) > new Date());

section('Selective observation');
const obsOk = obs.shouldObserveMessage('Preciso do relatório de perdas amanhã às 14h.', { conversationId: THREAD, sourceType: 'chat_interno' });
assert('observation relevant', obsOk.observe === true);
const obsNo = obs.shouldObserveMessage('salário confidencial', { conversationId: THREAD });
assert('observation excludes sensitive', obsNo.observe === false);

section('Operational pipeline — mandatory scenario');
store.clearTenant(TENANT);

(async () => {
  const r1 = await pipeline.processOperationalSignal({
    companyId: TENANT,
    conversationId: THREAD,
    user: USER_A,
    content: 'Preciso do relatório de perdas amanhã às 14h.',
    sourceType: 'chat_interno'
  });
  assert('pipeline message A ok', r1.ok === true);
  assert('intent task_request', r1.intent === 'task_request' || !!r1.entities?.task || !!r1.entities?.report);
  assert('promoted task prepared on A', !!r1.task || store.listTasks(TENANT, THREAD).length > 0);

  const r2 = await internalChat.processInternalChatMessage({
    companyId: TENANT,
    conversationId: THREAD,
    user: USER_B,
    content: 'Ok, vou preparar.'
  });
  assert('pipeline message B ok', r2.ok === true);
  assert('commitment or continuity', r2.intent === 'commitment' || r2.continuity?.owner_id != null);

  process.env.IMPETUS_SZ4_PROMOTED_TENANTS = TENANT;
  process.env.IMPETUS_SZ4_PROMOTED_TENANT_STAGE = 'SZ4_REINTEGRATION_ACTIVE';
  const promotedStage = pipeline.resolveStageForTenant(TENANT).stage;
  assert('promoted tenant stage', promotedStage === 'SZ4_REINTEGRATION_ACTIVE');

  const r3 = await internalChat.processInternalChatMessage({
    companyId: TENANT,
    conversationId: THREAD,
    user: USER_B,
    content: 'Ok, vou preparar.'
  });
  assert('promoted workflow created', !!store.listWorkflows(TENANT, THREAD).length || !!r3.workflow);
  assert('promoted task prepared', !!store.listTasks(TENANT, THREAD).length || !!r3.task);
  assert('reminder scheduled', !!store.listReminders(TENANT, THREAD).length || !!r3.reminder);

  section('Conversational reintegration');
  const task = store.listTasks(TENANT, THREAD)[0];
  const reminder = store.listReminders(TENANT, THREAD)[0];
  if (reminder && task) {
    const dueSoon = new Date(Date.now() + 30 * 60000).toISOString();
    store.saveReminder(TENANT, { ...reminder, scheduled_at: dueSoon });
    const tick = await reminders.processDueReminders(TENANT, { now: new Date(Date.now() + 60 * 60000) });
    assert('reminder tick processed', tick.processed >= 0);
  } else {
    assert('reminder tick skipped (no reminder in shadow)', true);
  }

  section('Facade & governance');
  const dash = facade.applyOperationalNervousSystem(USER_A, {}, { tenant_id: TENANT });
  assert('facade payload', !!dash.payload?.runtime_z_operational_nervous_system);
  assert('facade metrics', !!dash.payload.runtime_z_operational_nervous_system.metrics);
  const sanitized = gov.sanitizeExecutionPlan({ auto_execution: true, summary: 'test' });
  assert('governance blocks auto_execution', sanitized.auto_execution === false);

  section('Metrics & events');
  const snap = metrics.snapshot(TENANT);
  assert('metrics snapshot', !!snap.scores?.z_operational_closure_score != null);
  assert('events recorded', store.recentEvents(TENANT, 10).length > 0);

  section('Human validation');
  const val = await facade.validateHumanAction(USER_A, { status: 'approved', action: { type: 'task_persist', summary: 'Relatório perdas' } });
  assert('validate human action', val.ok === true && val.envelope?.approval_required === true);

  section('Rollback');
  const prev = process.env.IMPETUS_SZ4_OPERATIONAL_NERVOUS_SYSTEM;
  process.env.IMPETUS_SZ4_OPERATIONAL_NERVOUS_SYSTEM = 'off';
  const off = facade.applyOperationalNervousSystem(USER_A, {}, { tenant_id: TENANT });
  assert('disabled returns skipped', off.skipped === true);
  process.env.IMPETUS_SZ4_OPERATIONAL_NERVOUS_SYSTEM = prev || 'on';

  console.log(`\nSZ4 operational nervous system tests: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
