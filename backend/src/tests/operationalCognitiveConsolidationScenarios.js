'use strict';

/**
 * IMPETUS — Operational Cognitive Consolidation Test Suite
 * Testa as 8 fases do Plano Mestre de Consolidação Operacional Cognitiva.
 */

(async () => {
  let passed = 0;
  let failed = 0;
  const failures = [];

  function assert(condition, label) {
    if (condition) {
      passed++;
    } else {
      failed++;
      failures.push(label);
      console.error(`  ✗ FAIL: ${label}`);
    }
  }

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  IMPETUS — Operational Cognitive Consolidation Tests');
  console.log('══════════════════════════════════════════════════════════════\n');

  /* ============================================================
   * F1 — CONSOLIDAÇÃO ESTRUTURAL: cognitiveAuthorityRouter
   * ============================================================ */
  console.log('── F1: Cognitive Authority Router ──');

  const authorityRouter = require('../services/enterprise/cognitiveAuthorityRouter');

  assert(authorityRouter.LIFECYCLE_STAGES.length === 8, 'F1.1 lifecycle has 8 stages');
  assert(authorityRouter.LIFECYCLE_STAGES[0] === 'request', 'F1.2 first stage is request');
  assert(authorityRouter.LIFECYCLE_STAGES[7] === 'replay', 'F1.3 last stage is replay');

  const routed = authorityRouter.route({ channel: 'dashboard_chat', company_id: 'C1', user_id: 'U1', payload: { q: 'test' } });
  assert(routed.request_id !== null, 'F1.4 route returns request_id');
  assert(routed.routing.verdict !== undefined, 'F1.5 route returns verdict');
  assert(routed.routing.target_runtime === 'decisionFacade', 'F1.6 dashboard routes to decisionFacade');
  assert(routed.lifecycle.request === 'completed', 'F1.7 request stage completed after route');
  assert(routed.lifecycle.registry === 'active', 'F1.8 registry stage active after route');

  const advResult = authorityRouter.advanceStage(routed.request_id, { registry_ok: true });
  assert(advResult && advResult.current_stage === 'governance', 'F1.9 advance moves to governance');

  const adv2 = authorityRouter.advanceStage(routed.request_id, { governance_ok: true });
  assert(adv2 && adv2.current_stage === 'arbitration', 'F1.10 advance moves to arbitration');

  const adv3 = authorityRouter.advanceStage(routed.request_id, {});
  const adv4 = authorityRouter.advanceStage(routed.request_id, {});
  const adv5 = authorityRouter.advanceStage(routed.request_id, {});
  const adv6 = authorityRouter.advanceStage(routed.request_id, {});
  const adv7 = authorityRouter.advanceStage(routed.request_id, {});
  assert(adv7 && adv7.status === 'completed', 'F1.11 request completes after all stages');
  assert(adv7 && adv7.latency_ms >= 0, 'F1.12 completed request has latency');

  const councilRoute = authorityRouter.route({ channel: 'council', payload: {} });
  assert(councilRoute.routing.target_runtime === 'council', 'F1.13 council routes correctly');

  const voiceRoute = authorityRouter.route({ channel: 'voice_input', payload: {} });
  assert(voiceRoute.routing.target_runtime === 'realtime', 'F1.14 voice routes to realtime');

  const legacyAudit = authorityRouter.auditLegacyPath('old_service', 'direct_call', { reason: 'test' });
  assert(legacyAudit.audit_id !== undefined, 'F1.15 legacy audit recorded');
  assert(authorityRouter.getLegacyAudit().length >= 1, 'F1.16 legacy audit retrievable');

  const failResult = authorityRouter.route({ channel: 'test_fail', payload: {} });
  authorityRouter.failRequest(failResult.request_id, 'test_error');
  const failedReq = authorityRouter.getRequest(failResult.request_id);
  assert(failedReq && failedReq.status === 'failed', 'F1.17 failed request tracked');

  authorityRouter.setRoutingRule('custom_channel', { verdict: 'redirect', target_runtime: 'sandbox' });
  const customRoute = authorityRouter.route({ channel: 'custom_channel', payload: {} });
  assert(customRoute.routing.target_runtime === 'sandbox', 'F1.18 custom routing rule applied');

  const routerHealth = authorityRouter.getHealth();
  assert(routerHealth.status !== undefined, 'F1.19 health status available');
  assert(routerHealth.metrics.requests_routed >= 5, 'F1.20 metrics track routed requests');

  /* ============================================================
   * F2 — CONSOLIDAÇÃO DE PIPELINE: pipelineAuthorityConsolidation
   * ============================================================ */
  console.log('── F2: Pipeline Authority Consolidation ──');

  const pipeline = require('../services/enterprise/pipelineAuthorityConsolidation');

  assert(pipeline.getMode() === 'shadow', 'F2.1 default mode is shadow');
  assert(pipeline.getModeLevel() === 1, 'F2.2 shadow level is 1');

  const eval1 = pipeline.evaluateAuthority({ channel: 'dashboard_chat', pipeline_confidence: 0.85 });
  assert(eval1.can_observe === true, 'F2.3 can observe in shadow mode');
  assert(eval1.can_shadow === true, 'F2.4 can shadow in shadow mode');
  assert(eval1.can_recommend === false, 'F2.5 cannot recommend in shadow mode');
  assert(eval1.can_govern === false, 'F2.6 cannot govern in shadow mode');
  assert(eval1.shadow_decision !== null, 'F2.7 shadow decision computed');
  assert(eval1.shadow_decision.suggested_target !== undefined, 'F2.8 shadow suggests target');

  const evalLowConf = pipeline.evaluateAuthority({ pipeline_confidence: 0.2, error_rate: 0.4 });
  assert(evalLowConf.shadow_decision.should_escalate === true, 'F2.9 escalation on low confidence');
  assert(evalLowConf.shadow_decision.suggested_target === 'fallback', 'F2.10 suggests fallback on high errors');

  const evalHighLatency = pipeline.evaluateAuthority({ pipeline_confidence: 0.5, latency_ms: 5000 });
  assert(evalHighLatency.shadow_decision.suggested_target === 'local', 'F2.11 suggests local on high latency');

  const evalDivergence = pipeline.evaluateAuthority({
    pipeline_confidence: 0.6,
    actual_target: 'gpt'
  });
  assert(typeof evalDivergence.shadow_decision.divergence_from_actual === 'boolean', 'F2.12 divergence detection works');

  const pipeMetrics = pipeline.getMetrics();
  assert(pipeMetrics.shadow_decisions_total >= 4, 'F2.13 shadow decisions tracked');
  assert(pipeMetrics.mode === 'shadow', 'F2.14 metrics reflect current mode');

  const pipeHealth = pipeline.getHealth();
  assert(pipeHealth.status !== undefined, 'F2.15 health status available');

  /* ============================================================
   * F3 — CONSOLIDAÇÃO OBSERVACIONAL: cognitiveColdStorage
   * ============================================================ */
  console.log('── F3: Cognitive Cold Storage ──');

  const coldStorage = require('../services/enterprise/cognitiveColdStorage');

  const storeId1 = coldStorage.store('replay', {
    company_id: 'C1', trace_id: 'T1',
    payload: { decision: 'test', confidence: 0.9 },
    timestamp: new Date().toISOString()
  });
  assert(storeId1 !== null, 'F3.1 store returns record_id');

  coldStorage.store('divergence', { company_id: 'C1', payload: { delta: 0.1 } });
  coldStorage.store('arbitration', { company_id: 'C2', payload: { model: 'gpt' } });

  const queried = coldStorage.query('replay', { company_id: 'C1' });
  assert(queried.length >= 1, 'F3.2 query returns stored records');
  assert(queried[0].payload && queried[0].payload.decision === 'test', 'F3.3 payload decompressed correctly');

  const queried2 = coldStorage.query('divergence', {});
  assert(queried2.length >= 1, 'F3.4 divergence records queryable');

  const temporal = coldStorage.temporalAnalysis('replay', { days: 1 });
  assert(temporal.total >= 1, 'F3.5 temporal analysis returns data');
  assert(temporal.aggregation.length >= 1, 'F3.6 temporal aggregation by day');

  coldStorage.store('governance_trace', { company_id: 'C1', trace_id: 'T2', payload: { policy: 'test' }, timestamp: '2020-01-01T00:00:00Z' });
  const archiveResult = coldStorage.archiveOlderThan(1);
  assert(archiveResult.archived >= 1, 'F3.7 old records archived');

  const snapshot = coldStorage.takeSnapshot();
  assert(snapshot.snapshot_id !== undefined, 'F3.8 snapshot has ID');
  assert(snapshot.total_records >= 0, 'F3.9 snapshot has total count');

  const coldHealth = coldStorage.getHealth();
  assert(coldHealth.status === 'healthy', 'F3.10 cold storage healthy');

  /* ============================================================
   * F4 — CONSOLIDAÇÃO OPERACIONAL: operationalDensityService
   * ============================================================ */
  console.log('── F4: Operational Density Service ──');

  const density = require('../services/enterprise/operationalDensityService');

  const emptyDensity = density.evaluate(null, { company_id: 'C_EMPTY' });
  assert(emptyDensity.overall_score === 0, 'F4.1 empty snapshot gives score 0');
  assert(emptyDensity.grade === 'F', 'F4.2 empty snapshot gives grade F');

  const richSnapshot = {
    production: { oee: 0.85, throughput: 120, _last_updated: new Date().toISOString(), _events: [] },
    maintenance: { mtbf: 240, _last_updated: new Date().toISOString(), _events: [] },
    quality: { fpy: 0.95, _last_updated: new Date().toISOString(), _events: [] },
    energy: { kwh: 5000, _last_updated: new Date().toISOString(), _events: [] },
    logistics: { on_time: 0.92, _last_updated: new Date().toISOString(), _events: [] },
    workforce: { headcount: 150, _last_updated: new Date().toISOString(), _events: [] },
    environment: { co2: 100, _last_updated: new Date().toISOString(), _events: [] },
    telemetry: { sensors: 45, _last_updated: new Date().toISOString(), _events: [] },
    _meta: { company_id: 'C_RICH', event_count: 50 }
  };

  const richDensity = density.evaluate(richSnapshot, { company_id: 'C_RICH' });
  assert(richDensity.overall_score > 0, 'F4.3 rich snapshot has positive score');
  assert(richDensity.grade !== 'F', 'F4.4 rich snapshot not grade F');
  assert(richDensity.dimensions.freshness.score >= 80, 'F4.5 fresh data scores high');
  assert(richDensity.dimensions.completeness.score === 100, 'F4.6 all domains = 100% completeness');
  assert(richDensity.cognitive_readiness !== 'insufficient', 'F4.7 rich data = cognitive readiness');

  const partialSnapshot = {
    production: { oee: 0.7, _last_updated: new Date(Date.now() - 7200000).toISOString(), _events: [] },
    _meta: { company_id: 'C_PARTIAL', event_count: 5 }
  };
  const partialDensity = density.evaluate(partialSnapshot, { company_id: 'C_PARTIAL' });
  assert(partialDensity.dimensions.completeness.score < 50, 'F4.8 partial coverage penalized');
  assert(partialDensity.overall_score < richDensity.overall_score, 'F4.9 partial < rich');

  const history = density.getDensityHistory('C_RICH');
  assert(history.length >= 1, 'F4.10 history recorded');

  const densityHealth = density.getHealth();
  assert(densityHealth.status === 'healthy', 'F4.11 density service healthy');
  assert(densityHealth.metrics.evaluations_total >= 2, 'F4.12 evaluations counted');

  /* ============================================================
   * F5 — VALIDAÇÃO COGNITIVA CONTÍNUA: continuousValidationEngine
   * ============================================================ */
  console.log('── F5: Continuous Validation Engine ──');

  const validation = require('../services/enterprise/continuousValidationEngine');

  const validOutput = { confidence: 0.85, content_length: 100, sources_cited: 2, claims_count: 3 };
  const validResult = validation.validate({}, validOutput, { baseline_confidence: 0.8 });
  assert(validResult.overall_valid === true, 'F5.1 valid output passes');
  assert(validResult.checks.length === 7, 'F5.2 all 7 checks run');

  const driftOutput = { confidence: 0.3, content_length: 50 };
  const driftResult = validation.validate({}, driftOutput, { baseline_confidence: 0.8 });
  assert(driftResult.overall_valid === false, 'F5.3 drift detected');
  assert(driftResult.violations.some(v => v.type === 'drift'), 'F5.4 drift violation recorded');

  const halluOutput = { confidence: 0.2, content_length: 500, sources_cited: 0, claims_count: 5, contradictions_detected: true };
  const halluResult = validation.validate({}, halluOutput, { baseline_confidence: 0.8 });
  assert(halluResult.violations.some(v => v.type === 'hallucination'), 'F5.5 hallucination detected');
  assert(halluResult.violations.find(v => v.type === 'hallucination').severity === 'critical', 'F5.6 hallucination severity critical');

  const regressOutput = { confidence: 0.7, quality_score: 0.5 };
  const regressResult = validation.validate({}, regressOutput, { baseline_confidence: 0.7, previous_quality: 0.8 });
  assert(regressResult.violations.some(v => v.type === 'regression'), 'F5.7 regression detected');

  const govViolation = { confidence: 0.8, bypassed_governance: true, no_audit_trail: true };
  const govResult = validation.validate({}, govViolation, { baseline_confidence: 0.8 });
  assert(govResult.violations.some(v => v.type === 'governance_violation'), 'F5.8 governance violation detected');

  const latencyOutput = { confidence: 0.8, latency_ms: 15000 };
  const latencyResult = validation.validate({}, latencyOutput, { baseline_confidence: 0.8, latency_threshold_ms: 5000 });
  assert(latencyResult.violations.some(v => v.type === 'latency_spike'), 'F5.9 latency spike detected');

  validation.recordBenchmark('gpt', { precision: 0.9, coherence: 0.85, latency_ms: 400, stability: 0.9 });
  validation.recordBenchmark('claude', { precision: 0.88, coherence: 0.92, latency_ms: 350, stability: 0.88 });
  validation.recordBenchmark('gemini', { precision: 0.82, coherence: 0.8, latency_ms: 200, stability: 0.85 });

  const comparison = validation.getTemporalComparison();
  assert(comparison.comparison.length === 3, 'F5.10 3 models compared');
  assert(comparison.comparison[0].avg_precision !== null, 'F5.11 precision averaged');
  assert(comparison.comparison[0].avg_latency_ms !== null, 'F5.12 latency averaged');

  const violations = validation.getRecentViolations();
  assert(violations.length >= 3, 'F5.13 violations accessible');

  const valHealth = validation.getHealth();
  assert(valHealth.status !== undefined, 'F5.14 validation health available');
  assert(valHealth.metrics.validations_run >= 5, 'F5.15 validations counted');

  /* ============================================================
   * F6 — MEDIÇÃO DE COMPORTAMENTO REAL: cognitivePressureService
   * ============================================================ */
  console.log('── F6: Cognitive Pressure Service ──');

  const pressure = require('../services/enterprise/cognitivePressureService');

  const sample1 = pressure.sample({
    queue_depth: 100, max_queue: 5000,
    arbitrations_per_min: 10, arbitration_threshold: 50,
    policies_active: 20, violations_per_min: 2,
    events_per_sec: 30, max_events_per_sec: 200,
    divergence_rate: 0.05, drift_rate: 0.03, instability_rate: 0.02
  });
  assert(sample1 !== null, 'F6.1 sample collected');
  assert(sample1.overall_pressure >= 0 && sample1.overall_pressure <= 1, 'F6.2 pressure in [0,1]');
  assert(sample1.alert_level === 'normal', 'F6.3 low pressure = normal alert');
  assert(Object.keys(sample1.dimensions).length === 6, 'F6.4 6 pressure dimensions');

  const sampleHigh = pressure.sample({
    queue_depth: 4500, max_queue: 5000,
    arbitrations_per_min: 90, arbitration_threshold: 50,
    events_per_sec: 190, max_events_per_sec: 200,
    divergence_rate: 0.7, drift_rate: 0.8, instability_rate: 0.9
  });
  assert(sampleHigh.overall_pressure > 0.5, 'F6.5 high signals = high pressure');
  assert(sampleHigh.alert_level === 'critical' || sampleHigh.alert_level === 'high', 'F6.6 alert raised');

  const healthScore = pressure.computeHealthScore({
    avg_latency_ms: 300,
    consensus_rate: 0.9,
    divergence_rate: 0.05,
    overall_pressure: 0.2,
    drift_rate: 0.03,
    stability_score: 0.92,
    saturation: 0.1
  });
  assert(healthScore.overall_score > 70, 'F6.7 good signals = healthy score');
  assert(healthScore.grade === 'A+' || healthScore.grade === 'A' || healthScore.grade === 'B', 'F6.8 good grade');
  assert(healthScore.status === 'healthy', 'F6.9 healthy status');
  assert(Object.keys(healthScore.dimensions).length === 7, 'F6.10 7 health dimensions');

  const degradedHealth = pressure.computeHealthScore({
    avg_latency_ms: 8000,
    consensus_rate: 0.3,
    divergence_rate: 0.5,
    overall_pressure: 0.9,
    drift_rate: 0.7,
    stability_score: 0.2,
    saturation: 0.8
  });
  assert(degradedHealth.overall_score < 50, 'F6.11 bad signals = low score');
  assert(degradedHealth.status === 'critical', 'F6.12 critical status');

  const samples = pressure.getRecentPressureSamples();
  assert(samples.length >= 2, 'F6.13 samples retrievable');

  const trend = pressure.getPressureTrend();
  assert(trend.trend !== undefined, 'F6.14 trend calculated');

  const latest = pressure.getLatestHealthScore();
  assert(latest !== null, 'F6.15 latest health score accessible');

  const pressHealth = pressure.getHealth();
  assert(pressHealth.status !== undefined, 'F6.16 pressure health available');
  assert(pressHealth.metrics.samples_collected >= 2, 'F6.17 samples counted');

  /* ============================================================
   * F7+F8 — GOVERNANCE MATURITY + ENTERPRISE STABILIZATION: boundedGovernanceEngine
   * ============================================================ */
  console.log('── F7+F8: Bounded Governance Engine ──');

  const bounded = require('../services/enterprise/boundedGovernanceEngine');

  const forbidden1 = bounded.checkBoundary('self_modify_policy', {});
  assert(forbidden1.allowed === false, 'F7.1 self_modify_policy blocked');
  assert(forbidden1.category === 'forbidden', 'F7.2 blocked category is forbidden');

  const forbidden2 = bounded.checkBoundary('auto_promote_authority', {});
  assert(forbidden2.allowed === false, 'F7.3 auto_promote_authority blocked');

  const forbidden3 = bounded.checkBoundary('autonomous_mutation', {});
  assert(forbidden3.allowed === false, 'F7.4 autonomous_mutation blocked');

  const forbidden4 = bounded.checkBoundary('self_governance', {});
  assert(forbidden4.allowed === false, 'F7.5 self_governance blocked');

  const forbidden5 = bounded.checkBoundary('runtime_authority_switch', {});
  assert(forbidden5.allowed === false, 'F7.6 runtime_authority_switch blocked');

  const forbidden6 = bounded.checkBoundary('self_modifying_runtime', {});
  assert(forbidden6.allowed === false, 'F7.7 self_modifying_runtime blocked');

  const allowed1 = bounded.checkBoundary('suggest_policy', { capability: 'suggest' });
  assert(allowed1.allowed === true, 'F7.8 suggest capability allowed');

  const allowed2 = bounded.checkBoundary('recommend_target', { capability: 'recommend' });
  assert(allowed2.allowed === true, 'F7.9 recommend capability allowed');

  const allowed3 = bounded.checkBoundary('measure_drift', { capability: 'measure' });
  assert(allowed3.allowed === true, 'F7.10 measure capability allowed');

  const allowed4 = bounded.checkBoundary('simulate_change', { capability: 'simulate' });
  assert(allowed4.allowed === true, 'F7.11 simulate capability allowed');

  const allowed5 = bounded.checkBoundary('observe_runtime', { capability: 'observe' });
  assert(allowed5.allowed === true, 'F7.12 observe capability allowed');

  const invalidCap = bounded.checkBoundary('auto_apply', { capability: 'execute' });
  assert(invalidCap.allowed === false, 'F7.13 invalid capability blocked');

  const suggestion = bounded.suggest('policy_adjustment', {
    priority: 'high',
    recommended_action: 'Reduce arbitration rate',
    rationale: 'Saturation approaching threshold'
  });
  assert(suggestion.suggestion_id !== undefined, 'F7.14 suggestion created');
  assert(suggestion.requires_human_approval === true, 'F7.15 requires human approval');
  assert(suggestion.auto_applied === false, 'F7.16 not auto-applied');

  const simulation = bounded.simulate(
    { type: 'authority_promotion', description: 'Promote to partial_authority' },
    { policies_active: 30 }
  );
  assert(simulation.risk_assessment !== undefined, 'F7.17 simulation produces risk assessment');
  assert(simulation.projected_impact !== undefined, 'F7.18 simulation has projected impact');

  const simPolicy = bounded.simulate(
    { type: 'policy_addition', description: 'Add new governance rule' },
    { policies_active: 60 }
  );
  assert(simPolicy.risk_assessment === 'high', 'F7.19 high policy count = high risk');

  const simLoad = bounded.simulate(
    { type: 'load_increase', target_load: 180 },
    { events_per_sec: 100 }
  );
  assert(simLoad.projected_impact.saturation_projected > 0, 'F7.20 load simulation computes saturation');

  const depthBlock = bounded.checkBoundary('deep_evaluation', { governance_depth: 10 });
  assert(depthBlock.allowed === false, 'F8.1 governance depth exceeded blocked');
  assert(depthBlock.category === 'cascade_prevention', 'F8.2 cascade prevention category');

  const cascadeBlock = bounded.checkBoundary('chain_action', { cascade_chain: 5 });
  assert(cascadeBlock.allowed === false, 'F8.3 cascade chain exceeded blocked');

  const overloadBlock = bounded.checkBoundary('heavy_action', { cognitive_pressure: 0.95 });
  assert(overloadBlock.allowed === false, 'F8.4 cognitive overload blocked');
  assert(overloadBlock.category === 'saturation', 'F8.5 saturation category');

  const suggestions = bounded.getRecentSuggestions();
  assert(suggestions.length >= 1, 'F8.6 suggestions retrievable');

  const boundaryViolations = bounded.getBoundaryViolations();
  assert(boundaryViolations.length >= 6, 'F8.7 boundary violations recorded');

  const satState = bounded.getSaturationState();
  assert(satState.limits !== undefined, 'F8.8 saturation limits visible');
  assert(satState.cascades_interrupted >= 2, 'F8.9 cascades interrupted counted');

  const boundedHealth = bounded.getHealth();
  assert(boundedHealth.status !== undefined, 'F8.10 bounded governance health available');
  assert(boundedHealth.metrics.boundary_checks >= 13, 'F8.11 boundary checks counted');

  /* ============================================================
   * INTEGRAÇÃO CRUZADA: Verificar que todos os serviços coexistem
   * ============================================================ */
  console.log('── Cross-Service Integration ──');

  const routed2 = authorityRouter.route({ channel: 'integration_test', payload: {} });
  const evalAuth = pipeline.evaluateAuthority({ channel: 'integration_test', pipeline_confidence: 0.75 });
  const coldId = coldStorage.store('arbitration', { trace_id: routed2.request_id, payload: { eval: evalAuth } });
  const validated = validation.validate({}, { confidence: 0.8, content_length: 100, sources_cited: 1, claims_count: 2 }, { baseline_confidence: 0.75 });
  const pressureSample = pressure.sample({ queue_depth: 50, max_queue: 5000, events_per_sec: 20, max_events_per_sec: 200 });
  const govCheck = bounded.checkBoundary('observe_runtime', { capability: 'observe' });

  assert(routed2.request_id !== null, 'INT.1 cross-service route works');
  assert(evalAuth.shadow_decision !== null, 'INT.2 cross-service pipeline evaluation works');
  assert(coldId !== null, 'INT.3 cross-service cold storage works');
  assert(validated.overall_valid === true, 'INT.4 cross-service validation works');
  assert(pressureSample !== null, 'INT.5 cross-service pressure works');
  assert(govCheck.allowed === true, 'INT.6 cross-service governance check works');

  const densityFromTelemetry = density.evaluate(richSnapshot, { company_id: 'C_INT' });
  assert(densityFromTelemetry.cognitive_readiness !== 'insufficient', 'INT.7 density feeds cognitive readiness');

  /* ============================================================
   * RESUMO
   * ============================================================ */
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log(`  RESULTADO: ${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.log('  FALHAS:');
    failures.forEach(f => console.log(`    - ${f}`));
  }
  console.log('══════════════════════════════════════════════════════════════\n');

  if (failed > 0) process.exit(1);
})();
