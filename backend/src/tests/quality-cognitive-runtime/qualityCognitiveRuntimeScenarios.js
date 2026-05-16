'use strict';

/**
 * Quality cognitive runtime — smoke, catálogo, orquestração (sem backbone real).
 */

process.env.IMPETUS_QUALITY_COGNITIVE_RUNTIME_ENABLED = 'true';
process.env.IMPETUS_QUALITY_DRIFT_PREDICTION_ENABLED = 'true';
process.env.IMPETUS_QUALITY_RECURRENCE_ANALYSIS_ENABLED = 'true';
process.env.IMPETUS_QUALITY_SUPPLIER_SCORING_ENABLED = 'true';
process.env.IMPETUS_QUALITY_ANOMALY_PREDICTION_ENABLED = 'true';
process.env.IMPETUS_QUALITY_PROCESS_DETERIORATION_ENABLED = 'true';
process.env.IMPETUS_QUALITY_CONTEXTUAL_RECOMMENDATIONS_ENABLED = 'true';
process.env.IMPETUS_QUALITY_EXECUTIVE_NARRATIVES_ENABLED = 'true';
process.env.IMPETUS_QUALITY_COGNITIVE_PUBLISH_EVENTS_ENABLED = 'false';

let p = 0;
let f = 0;
function ok(label, cond) {
  if (cond) {
    p++;
    console.log('  OK', label);
  } else {
    f++;
    console.log('  FAIL', label);
  }
}

(async () => {
  console.log('\nQUALITY COGNITIVE RUNTIME (backend)\n');

  const route = require('../../routes/qualityCognitive');
  ok('route load', typeof route === 'function' || (route && typeof route.use === 'function'));

  const { predictDrift } = require('../../domains/quality/cognitive/drift/qualityDriftPredictionEngine');
  const d = predictDrift([10, 10, 10, 10.2, 10.4, 10.7, 11, 11.3, 11.8, 12]);
  ok('drift engine', d.ok === true && d.drift_severity);

  const { analyzeRecurrence } = require('../../domains/quality/cognitive/recurrence/qualityRecurrenceAnalysisEngine');
  const now = Date.now();
  const rec = analyzeRecurrence(
    [
      { entity_type: 'l', entity_id: 'A', kind: 'k', occurred_at: now - 1000 },
      { entity_type: 'l', entity_id: 'A', kind: 'k', occurred_at: now - 500 }
    ],
    { window_hours: 24 }
  );
  ok('recurrence engine', rec.ok === true);

  const { buildCognitiveExplainability } = require('../../domains/quality/cognitive/explainability/qualityCognitiveExplainability');
  const ex = buildCognitiveExplainability({ rationale: 't', evidence: ['a'], confidence: 0.5 });
  ok('explainability assistive', ex.assistive_only === true && ex.human_review_required === true);

  const { validateCatalogType } = require('../../eventPipeline/catalog/industrialEventCatalog');
  for (const t of [
    'quality.cognitive.drift_predicted',
    'quality.cognitive.recurrence_detected',
    'quality.cognitive.supplier_score_changed',
    'quality.cognitive.anomaly_predicted',
    'quality.cognitive.process_deterioration_detected',
    'quality.cognitive.recommendation_generated',
    'quality.cognitive.executive_insight_generated',
    'quality.cognitive.risk_escalated',
    'quality.cognitive.pattern_detected'
  ]) {
    const v = validateCatalogType(t, { strict: true });
    ok(`catalog ${t}`, v.ok === true);
  }

  const contract = require('../../domains/quality/contracts/qualityDomainContract');
  ok('contract v7 cognitive', contract.CONTRACT_VERSION === 7 && contract.COGNITIVE_API_PREFIX === '/api/quality-cognitive');

  delete require.cache[require.resolve('../../domains/quality/cognitive/orchestration/qualityCognitiveOrchestrator')];
  const { runCognitiveQualityPack } = require('../../domains/quality/cognitive/orchestration/qualityCognitiveOrchestrator');
  const companyId = '00000000-0000-4000-8000-000000000001';
  const pack = await runCognitiveQualityPack(companyId, 'user-1', {
    supplier_id: 'demo-supplier',
    process_values: [10, 10.1, 10.2, 10.4, 10.5, 10.8, 11, 11.2, 11.5, 11.9, 12.1, 12.4],
    defect_rates: [0.01, 0.011, 0.013, 0.016, 0.019, 0.022],
    recurrence_records: [
      { entity_type: 'line', entity_id: 'L1', kind: 'dent', occurred_at: new Date(Date.now() - 2 * 86400000).toISOString() },
      { entity_type: 'line', entity_id: 'L1', kind: 'dent', occurred_at: new Date(Date.now() - 86400000).toISOString() },
      { entity_type: 'line', entity_id: 'L1', kind: 'dent', occurred_at: new Date().toISOString() }
    ],
    supplier_rows: [
      { inspected: 200, defects: 1, lots: 2, rejected_lots: 0 },
      { inspected: 200, defects: 8, lots: 2, rejected_lots: 1 }
    ],
    usl: 14,
    lsl: 7
  }, { emit_events: false });

  ok('orchestrator pack', pack.ok === true && pack.engines && pack.risk);

  console.log(`\n${p} passed ${f} failed\n`);
  process.exit(f > 0 ? 1 : 0);
})();
