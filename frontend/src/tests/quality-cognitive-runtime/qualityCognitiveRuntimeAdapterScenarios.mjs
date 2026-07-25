/**
 * INC-031 — Adapter runtime → sinais cognitivos + gate montagem Z.23.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  buildCognitiveSignalsFromRuntime,
  buildRuntimeInsightPack,
  hasSufficientSignalsForRunInsights,
  resolveQualityRuntimeContext
} from '../../domains/quality/cognitive/qualityCognitiveRuntimeSignalAdapter.js';
import { resolveSpecializedCockpitRuntime } from '../../cognitiveRuntime/cockpit/specializedCockpitResolver.js';
import { resolvePromotedQualityHubs } from '../../cognitiveRuntime/cockpit/qualityNativeCockpitRegistry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const hubPath = join(__dirname, '../../domains/quality/cognitive/CognitiveQualityHub.jsx');

let passed = 0;
let failed = 0;

function ok(label, cond) {
  if (cond) {
    console.log(`  OK ${label}`);
    passed++;
  } else {
    console.error(`  FAIL ${label}`);
    failed++;
  }
}

console.log('\nINC-031 quality-cognitive-runtime adapter\n');

const hubSrc = readFileSync(hubPath, 'utf8');
ok('no buildSignals in hub', !hubSrc.includes('function buildSignals'));
ok('no default-supplier mock', !hubSrc.includes('default-supplier'));
ok('no hardcoded process_values demo', !hubSrc.includes('10.1, 10.05'));
ok('uses runtime adapter', hubSrc.includes('qualityCognitiveRuntimeSignalAdapter'));
ok('uses fetchDashboardMeShared', hubSrc.includes('fetchDashboardMeShared'));

const meFixture = {
  specialized_cockpit_runtime: {
    consolidation_applied: true,
    cockpit_mode: 'quality_native',
    cognitive_health: { specialization: 0.72 }
  },
  quality_cognitive_centers: [
    {
      center_id: 'quality_telemetry_spc',
      ok: true,
      metrics: { drift_severity: 'high', drift_confidence: 0.91, dimensional_trend: 0.04 }
    },
    {
      center_id: 'quality_governance',
      ok: true,
      metrics: { supplier_score: null, supplier_risk: 'unknown' }
    },
    { center_id: 'quality_narrative', ok: false, headline: 'Qualidade operacional', metrics: {} },
    { center_id: 'quality_operational_nc', ok: true, metrics: { recurrence_key: 'line-L4-scratch' } }
  ],
  quality_operational_metrics: {
    metrics: { deterioration_score: 0.55, dominant_recurrence_key: 'line-L4-scratch' }
  },
  quality_insights: [{ id: 'ins1', title: 'nc', body: 'NC monitoradas', priority: 'medium' }],
  quality_decision_support: {
    questions: [{ id: 'q1', text: 'Quais desvios aumentaram?' }]
  }
};

const ctx = resolveQualityRuntimeContext(meFixture);
ok('runtime connected', ctx.connected === true);

const signals = buildCognitiveSignalsFromRuntime(meFixture);
ok('no synthetic process_values', signals.process_values.length === 0);
ok('recurrence from runtime', signals.recurrence_records.length === 1);
ok('no mock supplier id', signals.supplier_id == null);
ok('insufficient for runInsights without series', hasSufficientSignalsForRunInsights(signals) === false);

const pack = buildRuntimeInsightPack(meFixture);
ok('drift from telemetry center', pack.engines.drift.ok === true && pack.engines.drift.drift_severity === 'high');
ok('supplier unavailable when score null', pack.unavailable.supplier === true);
ok('narrative unavailable when center not ok', pack.unavailable.narrative === true);
ok('recommendations from insights', pack.recommendations?.recommendations?.length >= 1);
ok('risk from operational metrics', pack.risk?.predictive_risk_score === 0.55);

console.log('\nINC-031 QualityNativeCockpitPromotion mount gate\n');

const resolved = resolveSpecializedCockpitRuntime(meFixture);
ok('qualityNativeActive gate', resolved?.runtime?.consolidation_applied === true);
const hubs = resolvePromotedQualityHubs(resolved.centers);
ok('cognitive hub promoted', hubs.some((h) => h.hubKey === 'cognitive'));

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
