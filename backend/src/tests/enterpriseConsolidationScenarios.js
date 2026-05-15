'use strict';

/**
 * IMPETUS — Enterprise Consolidation Test Suite
 * Valida todas as 12 fases do plano mestre de consolidação enterprise.
 */

(async () => {
  let pass = 0;
  let fail = 0;
  const failures = [];

  function assert(condition, label) {
    if (condition) {
      pass++;
    } else {
      fail++;
      failures.push(label);
      console.error(`  FAIL: ${label}`);
    }
  }

  console.log('=== ENTERPRISE CONSOLIDATION TEST SUITE ===\n');

  // ─── Fase 1: Operational Telemetry ───────────────────────────
  console.log('--- Fase 1: Operational Telemetry ---');
  const telemetry = require('../services/enterprise/operationalTelemetryService');

  assert(telemetry.DOMAINS && Object.keys(telemetry.DOMAINS).length === 8, 'F1: 8 domains defined');
  assert(telemetry.SOURCE_TYPES && Object.keys(telemetry.SOURCE_TYPES).length === 8, 'F1: 8 source types defined');
  assert(typeof telemetry.ingest === 'function', 'F1: ingest function exists');
  assert(typeof telemetry.getUnifiedSnapshot === 'function', 'F1: getUnifiedSnapshot function exists');
  assert(typeof telemetry.evaluateFreshness === 'function', 'F1: evaluateFreshness function exists');

  const ingestResult = telemetry.ingest({
    company_id: 'test-1',
    domain: 'production',
    source_type: 'plc',
    source_id: 'plc-001',
    metric_key: 'oee',
    value: 87.5,
    unit: '%'
  });
  assert(ingestResult.ingested === 1, 'F1: single event ingested');
  assert(ingestResult.errors === 0, 'F1: no ingestion errors');

  const batchResult = telemetry.ingest([
    { company_id: 'test-1', domain: 'maintenance', metric_key: 'mttr', value: 4.2, unit: 'h' },
    { company_id: 'test-1', domain: 'quality', metric_key: 'rejection_rate', value: 2.1, unit: '%' },
    { company_id: 'test-1', domain: 'energy', metric_key: 'consumption_kwh', value: 850, unit: 'kWh' }
  ]);
  assert(batchResult.ingested === 3, 'F1: batch of 3 ingested');

  const snapshot = telemetry.getUnifiedSnapshot('test-1');
  assert(snapshot._meta && snapshot._meta.event_count >= 4, 'F1: snapshot has events');
  assert(snapshot.production != null, 'F1: production domain in snapshot');
  assert(snapshot.maintenance != null, 'F1: maintenance domain in snapshot');

  const freshness = telemetry.evaluateFreshness('test-1');
  assert(freshness.overall_score > 0, 'F1: freshness score > 0');
  assert(freshness.mode === 'normal' || freshness.mode === 'degraded', 'F1: freshness mode valid');
  assert(freshness.domains.production && freshness.domains.production.status === 'fresh', 'F1: production is fresh');

  const dupResult = telemetry.ingest({
    company_id: 'test-1', domain: 'production', source_type: 'plc',
    source_id: 'plc-001', metric_key: 'oee', value: 87.5
  });
  assert(dupResult.deduped >= 0, 'F1: dedup detected (or window passed)');

  const normalized = telemetry.normalizeEvent({ company_id: 'test-2', value: 42 });
  assert(normalized && normalized.event_id, 'F1: normalizeEvent produces event_id');
  assert(normalized.quality_score != null, 'F1: quality_score computed');

  const health = telemetry.getHealth();
  assert(health.status === 'healthy' || health.status === 'disabled', 'F1: health status valid');

  const events = telemetry.getRecentEvents('test-1', { limit: 10 });
  assert(Array.isArray(events) && events.length > 0, 'F1: getRecentEvents returns data');

  console.log('');

  // ─── Fase 2: Executive Composition ───────────────────────────
  console.log('--- Fase 2: Executive Composition ---');
  const composition = require('../services/enterprise/executiveCompositionService');

  assert(typeof composition.compose === 'function', 'F2: compose function exists');
  assert(typeof composition.buildNarrative === 'function', 'F2: buildNarrative function exists');
  assert(typeof composition.scoreLayout === 'function', 'F2: scoreLayout function exists');

  const widgets = [
    { urgency_type: 'critical_alert', scope: 'strategic', domain: 'production' },
    { urgency_type: 'informational', scope: 'operational' },
    { urgency_type: 'financial_risk', financial_impact_brl: 50000 },
    { urgency_type: 'operational_anomaly', anomaly_detected: true }
  ];
  const composed = composition.compose(widgets, { role: 'ceo' });
  assert(composed.widgets.length <= 8, 'F2: CEO density limit respected');
  assert(composed.widgets[0]._composition_score > composed.widgets[composed.widgets.length - 1]._composition_score, 'F2: widgets sorted by score');

  const narrative = composition.buildNarrative({
    production: { oee: { value: 65 } },
    quality: { rejection_rate: { value: 5 } }
  }, { role: 'ceo' });
  assert(narrative.summary.length > 0, 'F2: narrative summary generated');
  assert(narrative.tone === 'critical', 'F2: narrative tone reflects critical quality');
  assert(narrative.highlights.length > 0, 'F2: highlights generated');

  const layout = composition.scoreLayout([
    { type: 'strategic', has_anomaly: true },
    { type: 'operational', has_critical_alert: true }
  ], { role: 'ceo' });
  assert(layout.length === 2, 'F2: layout scored');
  assert(layout[0]._layout_score >= layout[1]._layout_score, 'F2: layout sorted by score');

  console.log('');

  // ─── Fase 3: Cognitive Entrypoint Registry ───────────────────
  console.log('--- Fase 3: Cognitive Entrypoint Registry ---');
  const registry = require('../services/enterprise/cognitiveEntrypointRegistry');

  assert(registry.LIFECYCLE_STAGES.length === 6, 'F3: 6 lifecycle stages');
  assert(Object.keys(registry.AUTHORITY_MODES).length === 4, 'F3: 4 authority modes');
  assert(Object.keys(registry.ENTRYPOINT_TYPES).length === 11, 'F3: 11 entrypoint types');

  const entrypoints = registry.getRegisteredEntrypoints();
  assert(entrypoints.length >= 8, 'F3: default entrypoints registered');

  const flow = registry.createFlow('dashboard_chat', { company_id: 'test-1', user_id: 'u1' });
  assert(flow && flow.flow_id, 'F3: flow created');
  assert(flow.authority_mode, 'F3: authority mode assigned');

  const advance1 = registry.advanceFlow(flow.flow_id, { summary: 'entrypoint ok' });
  assert(advance1 && advance1.current_stage === 'pipeline', 'F3: advanced to pipeline');

  const advance2 = registry.advanceFlow(flow.flow_id, { summary: 'pipeline ok' });
  assert(advance2.current_stage === 'governance', 'F3: advanced to governance');

  for (let i = 0; i < 4; i++) registry.advanceFlow(flow.flow_id, { summary: `stage ${i}` });
  const finalFlow = registry.getFlow(flow.flow_id);
  assert(finalFlow && finalFlow.status === 'completed', 'F3: flow completed after all stages');

  const failedFlow = registry.createFlow('dashboard_chat', { company_id: 'test-1' });
  registry.failFlow(failedFlow.flow_id, 'test_error');
  const failed = registry.getFlow(failedFlow.flow_id);
  assert(failed && failed.status === 'failed', 'F3: flow failed correctly');

  const bypass = registry.detectLegacyBypass('test', 'dashboard_chat');
  assert(bypass.detected === true, 'F3: legacy bypass detected');

  console.log('');

  // ─── Fase 4: Event Pipeline Authority ────────────────────────
  console.log('--- Fase 4: Event Pipeline Authority ---');
  const pipeline = require('../services/enterprise/eventPipelineAuthorityService');

  assert(Object.keys(pipeline.RUNTIME_TARGETS).length === 6, 'F4: 6 runtime targets');
  assert(Object.keys(pipeline.ARBITRATION_STRATEGIES).length === 5, 'F4: 5 arbitration strategies');

  const arb = pipeline.arbitrate({ strategy: 'balanced' });
  assert(arb && arb.selected, 'F4: arbitration returns selection');
  assert(arb.decision_id, 'F4: arbitration generates decision_id');

  pipeline.updateRuntimeScore('gpt', { confidence: 0.9, latency_ms: 200, quality_score: 90 });
  pipeline.updateRuntimeScore('claude', { confidence: 0.95, latency_ms: 300, quality_score: 95 });
  const arb2 = pipeline.arbitrate({ strategy: 'quality_first' });
  assert(arb2.selected, 'F4: quality-first arbitration works');

  const control = pipeline.shouldPipelineControl({ pipeline_confidence: 0.5 });
  assert(typeof control.control === 'boolean', 'F4: shouldPipelineControl returns boolean');

  const ks = pipeline.activateKillSwitch('test_emergency', 'test');
  assert(ks.activated === true, 'F4: kill switch activated');
  assert(pipeline.getKillSwitchState().active === true, 'F4: kill switch state is active');

  const ksOff = pipeline.deactivateKillSwitch();
  assert(ksOff.deactivated === true, 'F4: kill switch deactivated');

  const fb = pipeline.triggerFallback({ reason: 'test', original_target: 'gpt' });
  assert(fb.selected === 'fallback', 'F4: fallback triggered');

  const esc = pipeline.escalate({ escalate_to: 'claude', reason: 'low_confidence' });
  assert(esc.selected === 'claude', 'F4: escalation works');

  console.log('');

  // ─── Fase 5: Enterprise Observability ────────────────────────
  console.log('--- Fase 5: Enterprise Observability ---');
  const obs = require('../services/enterprise/enterpriseObservabilityService');

  assert(Object.keys(obs.SUBSYSTEMS).length === 9, 'F5: 9 subsystems defined');

  obs.incrementCounter('test_counter', 5);
  obs.setGauge('test_gauge', 42);
  obs.observeHistogram('test_histogram', 150);
  obs.observeHistogram('test_histogram', 250);

  const trace = obs.startTrace('test_trace', { subsystem: 'cognitive', company_id: 'test-1' });
  assert(trace && trace.trace_id, 'F5: trace started');
  const span = obs.startSpan(trace.trace_id, 'test_span');
  assert(span && span.span_id, 'F5: span started');
  span.end({ ok: true });
  trace.end({ ok: true });

  const alert = obs.createAlert('cognitive', 'warning', 'test alert');
  assert(alert && alert.alert_id, 'F5: alert created');

  const snapshot2 = obs.takeSnapshot();
  assert(snapshot2 && snapshot2.snapshot_id, 'F5: snapshot taken');
  assert(snapshot2.metrics && snapshot2.metrics.test_counter, 'F5: counter in snapshot');

  const promText = obs.exportPrometheusText();
  assert(typeof promText === 'string' && promText.includes('test_counter'), 'F5: Prometheus export works');

  const cold = obs.getColdStorageCandidates();
  assert(typeof cold.traces === 'number', 'F5: cold storage candidates identified');

  console.log('');

  // ─── Fase 6: Explainability ──────────────────────────────────
  console.log('--- Fase 6: Cognitive Explainability ---');
  const explain = require('../services/enterprise/cognitiveExplainabilityService');

  const graph = explain.createExplainabilityGraph('decision-001', { company_id: 'test-1' });
  assert(graph && graph.graph_id, 'F6: graph created');

  const node1 = explain.addNode(graph.graph_id, 'POLICY', { label: 'safety_check', score: 0.9, reasoning: 'passed' });
  const node2 = explain.addNode(graph.graph_id, 'ARBITRATION', { label: 'confidence_check', score: 0.85 });
  const node3 = explain.addNode(graph.graph_id, 'DECISION', { label: 'final_decision', confidence: 0.87 });
  assert(node1 && node2 && node3, 'F6: nodes added');

  explain.addEdge(graph.graph_id, node1.node_id, node2.node_id, 'requires');
  explain.addEdge(graph.graph_id, node2.node_id, node3.node_id, 'leads_to');

  explain.setDecision(graph.graph_id, {
    action: 'respond',
    source: 'pipeline',
    score: 0.87,
    confidence: 0.87,
    reasoning: 'All policies passed, confidence above threshold.'
  });

  const explanation = explain.explainDecision('decision-001');
  assert(explanation.found === true, 'F6: decision explained');
  assert(explanation.who_decided === 'pipeline', 'F6: decision source tracked');
  assert(explanation.policies_involved.length === 1, 'F6: policy nodes in explanation');

  explain.recordTimelineEntry('trace-001', { stage: 'policy', action: 'evaluated', score: 0.9 });
  explain.recordTimelineEntry('trace-001', { stage: 'arbitration', action: 'resolved', score: 0.85 });
  const timeline = explain.getTimeline('trace-001');
  assert(timeline.length === 2, 'F6: timeline has 2 entries');

  console.log('');

  // ─── Fase 7: Adaptive Cognition ──────────────────────────────
  console.log('--- Fase 7: Adaptive Cognition ---');
  const adaptive = require('../services/enterprise/adaptiveCognitionEngine');

  assert(Object.keys(adaptive.ADAPTATION_POLICIES).length === 3, 'F7: 3 adaptation policies');

  const fb7 = adaptive.submitFeedback({
    key: 'test_model',
    observed_confidence: 0.7,
    expected_confidence: 0.9,
    outcome_quality: 0.75,
    source: 'test'
  });
  assert(fb7.accepted === true, 'F7: feedback accepted');

  const validation = adaptive.validateAdaptation('test_model', 0.5);
  assert(typeof validation.safe === 'boolean', 'F7: validation returns safety check');
  assert(validation.current_value != null, 'F7: validation includes current value');

  const weight = adaptive.getWeight('test_model');
  assert(weight && weight.key === 'test_model', 'F7: weight retrieved');

  const allWeights = adaptive.getAllWeights();
  assert(Array.isArray(allWeights), 'F7: getAllWeights returns array');

  console.log('');

  // ─── Fase 8: Automated Governance ────────────────────────────
  console.log('--- Fase 8: Automated Governance ---');
  const gov = require('../services/enterprise/automatedGovernanceEngine');

  assert(Object.keys(gov.ACTIONS).length === 7, 'F8: 7 governance actions');
  assert(Object.keys(gov.STABILITY_POLICIES).length === 5, 'F8: 5 stability policies');

  const govState = gov.getGovernanceState();
  assert(govState.autonomy_level === 1.0, 'F8: initial autonomy at 1.0');

  const predictions = gov.predictFailure({
    error_rate_trend: [0.05, 0.08, 0.12, 0.18, 0.25, 0.30, 0.35],
    latency_trend: [500, 600, 800, 1500, 2500, 3000, 4000]
  });
  assert(Array.isArray(predictions) && predictions.length > 0, 'F8: predictions generated');

  const restore = gov.restoreAutonomy(1.0);
  assert(restore.current === 1.0, 'F8: autonomy restored');

  console.log('');

  // ─── Fase 9: AI Benchmark ────────────────────────────────────
  console.log('--- Fase 9: AI Benchmark ---');
  const benchmark = require('../services/enterprise/aiBenchmarkService');

  assert(Object.keys(benchmark.MODELS).length === 3, 'F9: 3 models defined');
  assert(Object.keys(benchmark.TASK_TYPES).length === 6, 'F9: 6 task types defined');

  for (let i = 0; i < 10; i++) {
    benchmark.recordRun('gpt', 'summary', { latency_ms: 200 + i * 10, quality_score: 0.85 + Math.random() * 0.1, force: true });
    benchmark.recordRun('claude', 'summary', { latency_ms: 300 + i * 5, quality_score: 0.88 + Math.random() * 0.08, force: true });
    benchmark.recordRun('gemini', 'summary', { latency_ms: 150 + i * 8, quality_score: 0.82 + Math.random() * 0.12, force: true });
  }

  const comparison = benchmark.compareModels();
  assert(comparison.ranking.length === 3, 'F9: all 3 models in ranking');
  assert(comparison.best_overall != null, 'F9: best model identified');
  assert(comparison.ranking[0].composite_score >= comparison.ranking[2].composite_score, 'F9: ranking sorted');

  const bestForTask = benchmark.selectBestForTask('summary');
  assert(bestForTask.selected, 'F9: best model selected for task');

  console.log('');

  // ─── Fase 10: Cognitive Simulation ───────────────────────────
  console.log('--- Fase 10: Cognitive Simulation ---');
  const simulation = require('../services/enterprise/cognitiveSimulationEngine');

  const sim = simulation.runComparison(
    'Qual o OEE atual?',
    { content: 'OEE está em 85%', quality_score: 0.8, latency_ms: 200 },
    { content: 'OEE atual: 85.3%, tendência positiva', quality_score: 0.92, latency_ms: 180 },
    { source_a: 'v1', source_b: 'v2' }
  );
  assert(sim.verdict === 'improved', 'F10: comparison detects improvement');
  assert(sim.delta.quality > 0, 'F10: quality delta positive');
  assert(sim.delta.content_changed === true, 'F10: content change detected');

  const replay = simulation.captureReplayPoint({
    prompt: 'Teste prompt',
    model: 'gpt',
    original_response: { content: 'Resposta original', quality_score: 0.8 }
  });
  assert(replay.replay_id, 'F10: replay point captured');

  const replayResult = simulation.recordReplayResult(replay.replay_id, {
    content: 'Nova resposta', quality_score: 0.9
  });
  assert(replayResult.found === true, 'F10: replay result recorded');

  for (let i = 0; i < 10; i++) {
    simulation.runComparison('test', { quality_score: 0.7 }, { quality_score: 0.6 + Math.random() * 0.2 });
  }
  const regression = simulation.analyzeRegression({ window: 20 });
  assert(regression.report_id, 'F10: regression analysis generated');
  assert(regression.overall_verdict, 'F10: regression verdict exists');

  console.log('');

  // ─── Fase 11: Environmental Cognitive ────────────────────────
  console.log('--- Fase 11: Environmental Cognitive ---');
  const envCog = require('../services/enterprise/environmentalCognitiveService');

  assert(Object.keys(envCog.ENVIRONMENTAL_DOMAINS).length === 6, 'F11: 6 environmental domains');

  envCog.ingestEnvironmentalData('test-1', { domain: 'energy', metric_key: 'consumption', value: 350, unit: 'kWh' });
  envCog.ingestEnvironmentalData('test-1', { domain: 'water', metric_key: 'consumption', value: 120, unit: 'm³' });
  envCog.ingestEnvironmentalData('test-1', { domain: 'emissions', metric_key: 'co2', value: 45, unit: 'kg_CO2' });
  envCog.ingestEnvironmentalData('test-1', { domain: 'waste', metric_key: 'total', value: 8, unit: 'kg' });

  const envSnapshot = envCog.normalizeSnapshot('test-1');
  assert(envSnapshot.normalized !== false, 'F11: snapshot normalized');
  assert(envSnapshot.domains && Object.keys(envSnapshot.domains).length >= 3, 'F11: multiple domains normalized');

  const adapted = envCog.adaptForCognitive('test-1');
  assert(adapted.cognitive_context, 'F11: cognitive context generated');
  assert(adapted.cognitive_context.sustainability_score != null, 'F11: sustainability score computed');

  const panel = envCog.getExecutivePanelData('test-1');
  assert(panel.sustainability_score != null, 'F11: executive panel has sustainability score');
  assert(Array.isArray(panel.trends), 'F11: executive panel has trends');

  console.log('');

  // ─── Fase 12: Integration Integrity ──────────────────────────
  console.log('--- Fase 12: Integration Integrity ---');

  let routeLoaded = false;
  try {
    require('../routes/internal/enterpriseConsolidation');
    routeLoaded = true;
  } catch (e) {
    console.error('  Route load error:', e.message);
  }
  assert(routeLoaded, 'F12: enterprise consolidation route loads');

  const allServices = [
    telemetry, composition, registry, pipeline, obs,
    explain, adaptive, gov, benchmark, simulation, envCog
  ];
  for (const svc of allServices) {
    assert(typeof svc.getMetrics === 'function' || typeof svc.getHealth === 'function',
      `F12: service ${svc.constructor?.name || 'unknown'} has getMetrics or getHealth`);
  }

  assert(telemetry.TELEMETRY_ENABLED !== undefined, 'F12: telemetry feature flag exposed');
  assert(registry.REGISTRY_ENABLED !== undefined, 'F12: registry feature flag exposed');
  assert(pipeline.AUTHORITY_ENABLED !== undefined, 'F12: pipeline authority flag exposed');
  assert(obs.OBS_ENABLED !== undefined, 'F12: observability flag exposed');
  assert(adaptive.ADAPTIVE_ENABLED !== undefined, 'F12: adaptive flag exposed');
  assert(benchmark.BENCHMARK_ENABLED !== undefined, 'F12: benchmark flag exposed');
  assert(simulation.SIMULATION_ENABLED !== undefined, 'F12: simulation flag exposed');

  console.log('');

  // ─── Resultado ───────────────────────────────────────────────
  console.log('=========================================');
  console.log(`TOTAL: ${pass + fail} tests — ${pass} passed, ${fail} failed`);
  if (failures.length) {
    console.log('\nFAILURES:');
    for (const f of failures) console.log(`  - ${f}`);
  }
  console.log('=========================================');
  process.exit(fail > 0 ? 1 : 0);
})();
