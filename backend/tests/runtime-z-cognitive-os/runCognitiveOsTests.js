'use strict';

/**
 * SZ2 — Runtime Z Cognitive Operating System test suite.
 *
 * Cobre TODOS os scripts npm test:z-* declarados em package.json.
 * Determinístico, sem rede, sem DB.
 */

process.env.IMPETUS_SZ2_PERSISTENCE = 'off';
process.env.IMPETUS_SZ2_DEFAULT_STAGE = process.env.IMPETUS_SZ2_DEFAULT_STAGE || 'Z_COGNITIVE_SHADOW';

const path = require('path');
const base = path.resolve(__dirname, '..', '..', 'src', 'runtime-z-cognitive-os');

const facade = require(`${base}/facade/zCognitiveOperatingSystemFacade`);
const flags = require(`${base}/config/sz2FeatureFlags`);
const governance = require(`${base}/config/sz2GovernanceFlags`);
const omr = require(`${base}/memory/zOperationalMemoryRuntime`);
const conv = require(`${base}/memory/zConversationMemoryGraph`);
const wfMem = require(`${base}/memory/zWorkflowMemoryRuntime`);
const incMem = require(`${base}/memory/zIncidentMemoryRuntime`);
const taskMem = require(`${base}/memory/zTaskMemoryRuntime`);
const entMem = require(`${base}/memory/zEntityMemoryRuntime`);
const retention = require(`${base}/memory/zOperationalMemoryRetention`);
const intentCont = require(`${base}/continuity/zIntentContinuityRuntime`);
const implicit = require(`${base}/continuity/zImplicitIntentResolutionRuntime`);
const reasoningEng = require(`${base}/reasoning/zIndustrialReasoningRuntime`);
const opReasoning = require(`${base}/reasoning/zOperationalReasoningEngine`);
const decision = require(`${base}/reasoning/zOperationalDecisionSupportRuntime`);
const stateful = require(`${base}/reasoning/zStatefulReasoningRuntime`);
const ctxInfer = require(`${base}/context/zContextInferenceRuntime`);
const temporal = require(`${base}/context/zTemporalInferenceRuntime`);
const shiftInfer = require(`${base}/context/zShiftInferenceRuntime`);
const urgency = require(`${base}/context/zUrgencyInferenceRuntime`);
const risk = require(`${base}/context/zRiskInferenceRuntime`);
const actionsRuntime = require(`${base}/actions/zOperationalActionRuntime`);
const assistiveExec = require(`${base}/actions/zAssistiveExecutionRuntime`);
const orchestrator = require(`${base}/orchestration/zCognitiveOrchestrator`);
const govRuntime = require(`${base}/governance/zCognitiveGovernanceRuntime`);
const humanAuth = require(`${base}/governance/zHumanAuthorityRuntime`);
const autonomy = require(`${base}/governance/zAutonomyProtectionRuntime`);
const shadow = require(`${base}/shadow/zOperationalShadowDiffRuntime`);
const fallback = require(`${base}/resilience/zCognitiveFallbackRuntime`);
const memoryIntegrity = require(`${base}/resilience/zMemoryIntegrityRuntime`);

const TENANT = 'sz2-test-tenant';
const TENANT_B = 'sz2-test-tenant-B';
const USER = { id: 'u-1', company_id: TENANT, role_code: 'plant_manager' };

let passed = 0;
let failed = 0;
const failures = [];

function assert(name, cond, detail) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    failures.push({ name, detail });
    console.log(`  ✗ ${name}${detail ? ` :: ${JSON.stringify(detail)}` : ''}`);
  }
}

function section(title) {
  console.log(`\n── ${title} ─────────────────────────────────────`);
}

function resetTenant(t) {
  omr.clear(t);
  stateful.clearTrace(t);
}

resetTenant(TENANT);
resetTenant(TENANT_B);

section('config & flags');
assert('SZ2 enabled by default', flags.isEnabled() === true);
assert('default stage is Z_COGNITIVE_SHADOW', flags.defaultStage() === 'Z_COGNITIVE_SHADOW');
assert('invariants are immutable', Object.isFrozen(flags.invariants));
assert('invariants.assistive_only true', flags.invariants.assistive_only === true);
assert('invariants.auto_execution false', flags.invariants.auto_execution === false);
assert('invariants.plc_control false', flags.invariants.plc_control === false);
assert('governance enforces always-false', (() => {
  const sanitized = governance.enforceAssistiveOnly({ auto_execution: true, plc_control: true });
  return sanitized.auto_execution === false && sanitized.plc_control === false && sanitized.assistive_only === true;
})());

section('memory — operational + types + retention');
const rec = omr.record(TENANT, { type: 'generic', summary: 'first', tags: ['x'] });
assert('record returns recorded:true', rec.recorded === true);
assert('size grows', omr.size(TENANT) === 1);
omr.record(TENANT, { type: 'generic', summary: 'second' });
assert('size=2 after second insert', omr.size(TENANT) === 2);
assert('list returns array', Array.isArray(omr.list(TENANT)));
assert('tenant isolation (other tenant empty)', omr.size(TENANT_B) === 0);
const turn = conv.recordTurn(TENANT, USER, { message: 'Haverá treinamento NR12 dia 20.', intent: 'plan_training' });
assert('conversation memory recorded', turn.recorded === true);
assert('recent turns includes the new turn', conv.recentTurns(TENANT, 5).some((t) => t.id === turn.entry.id));
const wf = wfMem.recordWorkflow(TENANT, USER, { workflow_id: 'wf-1', summary: 'comunicado NR12', state: 'preparing' });
assert('workflow recorded', wf.recorded === true);
assert('active workflows visible', wfMem.activeWorkflows(TENANT).length === 1);
const incident = incMem.recordIncident(TENANT, USER, { incident_id: 'inc-1', severity: 'critical', summary: 'vazamento na linha 3', status: 'open' });
assert('incident recorded', incident.recorded === true);
assert('open incidents counted', incMem.openIncidents(TENANT).length === 1);
const t1 = taskMem.recordTask(TENANT, USER, { task_id: 't-1', status: 'prepared', summary: 'enviar comunicado NR12' });
assert('task recorded', t1.recorded === true);
const ent = entMem.recordEntity(TENANT, USER, { kind: 'training', label: 'Treinamento NR12 dia 20', tags: ['nr12'] });
assert('entity recorded', ent.recorded === true);
assert('retention prunes by cap when over limit', (() => {
  const big = [];
  for (let i = 0; i < 1500; i++) big.push({ id: `e_${i}`, ts: Date.now(), type: 'generic' });
  const out = retention.pruneByCap(big);
  return out.length <= 500;
})());

section('continuity — implicit intent + intent continuity engine');
const recentTurns = conv.recentTurns(TENANT, 10);
const implicitOut = implicit.resolveImplicitIntent('Envie o comunicado e gere lista de confirmação.', recentTurns);
assert('implicit intent detected', implicitOut.implicit === true);
assert('inherited_from points to previous turn', implicitOut.inherited_from && implicitOut.inherited_from.summary.includes('NR12'));
assert('anchors capture key tokens', Array.isArray(implicitOut.anchors));
const continuityOut = intentCont.buildIntentContinuity(TENANT, USER, 'Envie o comunicado e gere lista de confirmação.');
assert('continuation_score > 0.4', continuityOut.continuation_score >= 0.4);
assert('has inherited_context', !!continuityOut.inherited_context);
assert('continuity has workflow signal', continuityOut.workflow.has_active_workflow === true);
assert('continuity has operational signal', continuityOut.operational.has_operational_continuity === true);

section('reasoning — industrial + priority + criticality + escalation');
const reasoning = reasoningEng.reasonIndustrial(TENANT, 'vazamento crítico na linha 3', { continuity: continuityOut, operational: continuityOut.operational });
assert('criticality detected as critical', reasoning.criticality.level === 'critical');
assert('priority tier P1 or P2', ['P1', 'P2'].includes(reasoning.priority.tier));
assert('escalation suggests manager', ['plant_manager', 'area_manager'].includes(reasoning.escalation.suggested_escalation));
assert('detected_risks include environmental', reasoning.detected_risks.includes('environmental'));
assert('reasoning_quality > 0', reasoning.reasoning_quality > 0);
assert('industrial_intelligence_score in [0,1]', reasoning.industrial_intelligence_score >= 0 && reasoning.industrial_intelligence_score <= 1);
const opReas = opReasoning.reasonOperational(TENANT, 'enviar comunicado treinamento', { operational: continuityOut.operational });
assert('operational reasoning has impact block', !!opReas.impact && !!opReas.priority);
const dec = decision.buildDecisionSupport(TENANT, 'vazamento grave', { operational: continuityOut.operational, continuity: continuityOut });
assert('decision support is assistive only', dec.assistive_only === true && dec.auto_execution === false);
assert('decision support emits recommendations', Array.isArray(dec.recommendations) && dec.recommendations.length > 0);
assert('stateful reasoning recorded steps', stateful.currentTrace(TENANT).length > 0);

section('context — temporal + shift + urgency + risk + fusion');
const temp = temporal.inferTemporal(new Date('2026-05-24T14:30:00Z'));
assert('temporal infers business_hours boolean', typeof temp.business_hours === 'boolean');
assert('temporal infers part_of_day', ['madrugada', 'manha', 'tarde', 'noite'].includes(temp.part_of_day));
const sh = shiftInfer.inferShift(new Date('2026-05-24T03:00:00Z'));
assert('shift infers a known shift', ['turno_1', 'turno_2', 'turno_3'].includes(sh.shift_name));
const urg = urgency.inferUrgency('urgente, agora', { operational: { critical_incidents: 1 } });
assert('urgency level high when keyword + critical incident', urg.level === 'high');
const r = risk.inferRisk(reasoning, { operational: continuityOut.operational });
assert('risk score numeric', typeof r.risk_score === 'number');
const ctx = ctxInfer.inferContext(TENANT, USER, 'envie comunicado', { sst_cognitive_runtime: {}, production_cognitive_runtime: {} }, reasoning);
assert('context awareness_score numeric', typeof ctx.awareness_score === 'number');
assert('multi_domain detected when 2+ runtimes present', ctx.cross_domain.multi_domain === true);

section('actions — PreparedActions assistive only');
const actions = actionsRuntime.prepareOperationalActions({
  message: 'Envie o comunicado e gere lista de confirmação',
  continuity: continuityOut,
  context: ctx,
  reasoning
});
assert('actions count > 0', actions.count > 0);
assert('actions are assistive_only', actions.assistive_only === true && actions.auto_execution === false);
assert('every action has required_approvals', actions.actions.every((a) => Array.isArray(a.required_approvals) && a.required_approvals.length > 0));
assert('every action sanitized to assistive_only', actions.actions.every((a) => a.assistive_only === true && a.auto_execution === false && a.plc_control === false));
const blocked = assistiveExec.execute();
assert('execute() is blocked by invariant', blocked.ok === false && blocked.error === 'execution_blocked_by_sz2_invariant');
const reviewed = assistiveExec.reviewPreparedAction(actions.actions[0]);
assert('reviewPreparedAction flags human authority required', reviewed.requires_human_authority === true);

section('governance — human authority + autonomy protection');
const auth = humanAuth.assertHumanAuthority();
assert('human authority preserved', auth.human_authority_preserved === true);
assert('auto execution blocked', auth.auto_execution_blocked === true);
const aut = autonomy.detectAutonomyAttempts({ auto_execution: true, plc_control: true });
assert('autonomy attempts detected and flagged blocked', aut.blocked === true);
const gov = govRuntime.evaluateGovernance({ actions, stage: 'Z_COGNITIVE_SHADOW' });
assert('governance score = 1 in valid state', gov.governance_score === 1);

section('shadow — diff + reasoning comparison + context accuracy');
const sh1 = shadow.runShadowDiff({
  tenantId: TENANT,
  message: 'Envie o comunicado',
  continuity: continuityOut,
  context: ctx,
  reasoning,
  legacyHints: { priority_hint: reasoning.priority.tier }
});
assert('shadow runs and not skipped', !sh1.skipped);
assert('shadow compatibility_score 0..1', sh1.compatibility_score >= 0 && sh1.compatibility_score <= 1);
assert('reasoning comparison aligned', sh1.reasoning_comparison.aligned === true);

section('resilience — fallback + memory integrity');
const integ = memoryIntegrity.verifyMemoryIntegrity(TENANT);
assert('memory integrity ok', integ.ok === true && integ.duplicate_ids === 0);
const fb = fallback.applyCognitiveFallback(TENANT, new Error('forced'));
assert('fallback marks safe', fb.safe === true && fb.assistive_only === true);

section('orchestrator + facade — end to end');
const orch = orchestrator.orchestrateCognition({
  tenantId: TENANT,
  user: USER,
  message: 'Envie o comunicado e gere lista de confirmação',
  payloadFromZRuntime: { sst_cognitive_runtime: {}, production_cognitive_runtime: {} }
});
assert('orchestrator yields narrative.sentences', Array.isArray(orch.narrative.sentences) && orch.narrative.sentences.length > 0);
assert('orchestrator yields actions', orch.actions.count > 0);
const facadeOut = facade.applyCognitiveOperatingSystem(USER, { sst_cognitive_runtime: {} }, {
  tenant_id: TENANT,
  message: 'Envie o comunicado e gere lista de confirmação'
});
assert('facade ok', facadeOut.ok === true);
assert('facade payload exposes runtime_z_cognitive_os', !!facadeOut.payload.runtime_z_cognitive_os);
assert('facade payload preserves assistive_only', facadeOut.payload.runtime_z_cognitive_os.assistive_only === true);
assert('facade payload preserves stage Z_COGNITIVE_SHADOW (default)', facadeOut.payload.runtime_z_cognitive_os.stage === 'Z_COGNITIVE_SHADOW');
assert('facade payload includes narrative', !!facadeOut.payload.runtime_z_cognitive_os.narrative);
assert('facade payload includes governance', !!facadeOut.payload.runtime_z_cognitive_os.governance);
assert('facade payload includes metrics', !!facadeOut.payload.runtime_z_cognitive_os.metrics);
assert('observability snapshot has applied_total > 0', facade.observability.snapshot().applied_total > 0);

section('tenant isolation cross-check');
resetTenant(TENANT_B);
const otherFacade = facade.applyCognitiveOperatingSystem({ id: 'u-2', company_id: TENANT_B }, {}, { tenant_id: TENANT_B, message: 'olá' });
assert('other tenant has zero inherited context', !otherFacade.payload.runtime_z_cognitive_os.continuity.inherited_context);
assert('other tenant has zero workflows', otherFacade.payload.runtime_z_cognitive_os.continuity.workflow.has_active_workflow === false);

section('rollback safety');
const previouslyDisabled = process.env.IMPETUS_SZ2_COGNITIVE_OS;
process.env.IMPETUS_SZ2_COGNITIVE_OS = 'off';
const offOut = facade.applyCognitiveOperatingSystem(USER, {}, { tenant_id: TENANT });
assert('facade returns skipped when disabled (rollback)', offOut.skipped === true);
process.env.IMPETUS_SZ2_COGNITIVE_OS = previouslyDisabled || 'on';

console.log('\n────────────────────────────────────────────────');
console.log(`SZ2 cognitive-os tests: ${passed} passed, ${failed} failed`);
if (failed) {
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f.name}`);
  process.exit(1);
}
process.exit(0);
