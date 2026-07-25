/**
 * OPM-008 — Cognitive Logistics & Decision Intelligence tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeClDashboardKpis } from '../../domains/logistics-operational/modules/cognitive-logistics/clKpiUtils.js';
import { computePredictiveInsights } from '../../domains/logistics-operational/modules/cognitive-logistics/clPredictiveUtils.js';
import {
  computeCognitiveRecommendations,
  buildCognitiveRecommendationRows
} from '../../domains/logistics-operational/modules/cognitive-logistics/clRecommendationEngine.js';
import { buildDecisionTrace, buildInsightTrace } from '../../domains/logistics-operational/modules/cognitive-logistics/clDecisionTrace.js';
import { runScenarioSimulation, CL_SCENARIO_CATALOG } from '../../domains/logistics-operational/modules/cognitive-logistics/clScenarioUtils.js';
import { buildClUnifiedTimeline } from '../../domains/logistics-operational/modules/cognitive-logistics/clTimelineUtils.js';
import { CL_HEURISTIC_RULES } from '../../domains/logistics-operational/modules/cognitive-logistics/clHeuristicRules.js';
import { CL_EVENTS } from '../../domains/logistics-operational/modules/cognitive-logistics/clObservability.js';
import {
  CL_COGNITIVE_INVARIANTS,
  CL_LAYER_PRINCIPLE
} from '../../domains/logistics-operational/modules/cognitive-logistics/clCognitiveInvariants.js';
import { CL_DATA_CONSUMPTION_CONTRACTS } from '../../domains/logistics-operational/modules/cognitive-logistics/clDataConsumptionContracts.js';
import { resolveLogisticsOperationalNavigation } from '../../presentation/eox/eoxRegistry.js';
import { getReuseRequirement } from '../../presentation/wms-reference-components/wmsRef001ReuseMatrix.js';
import { INVENTORY_INTEGRATION_CONTRACTS } from '../../domains/logistics-operational/modules/inventory/inventoryIntegrationContracts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const CL = path.join(FE, 'src/domains/logistics-operational/modules/cognitive-logistics');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

function read(rel) {
  return fs.readFileSync(path.join(FE, 'src', rel), 'utf8');
}

console.log('OPM-008 — Cognitive Logistics & Decision Intelligence Tests\n');

test('cognitive logistics module directory with foundation', () => {
  for (const f of [
    'CognitiveLogisticsModule.jsx',
    'useCognitiveLogisticsFoundation.js',
    'ClPredictiveInsightsPanel.jsx',
    'ClScenarioSimulationPanel.jsx',
    'ClDecisionTracePanel.jsx',
    'ClCognitiveMetricsPanel.jsx',
    'clKpiUtils.js',
    'clPredictiveUtils.js',
    'clRecommendationEngine.js',
    'clDecisionTrace.js',
    'clScenarioUtils.js',
    'clTimelineUtils.js',
    'clHeuristicRules.js',
    'clObservability.js',
    'clDataConsumptionContracts.js',
    'clCognitiveInvariants.js'
  ]) {
    assert.ok(fs.existsSync(path.join(CL, f)), f);
  }
});

test('CognitiveLogisticsModulePage uses cognitive module not generic frame', () => {
  const page = read('domains/logistics-operational/pages/standalone/CognitiveLogisticsModulePage.jsx');
  assert.ok(page.includes('CognitiveLogisticsModule'));
  assert.ok(page.includes('useCognitiveLogisticsFoundation'));
  assert.ok(!page.includes('WmsStandaloneModuleFrame'));
});

test('CognitiveLogisticsModule uses WMS-REF-001 and cognitive layer', () => {
  const mod = fs.readFileSync(path.join(CL, 'CognitiveLogisticsModule.jsx'), 'utf8');
  assert.ok(mod.includes('wms-reference-components'));
  assert.ok(mod.includes('InventoryDashboard'));
  assert.ok(mod.includes('data-wms-cognitive-layer'));
  assert.ok(mod.includes('OPM-008'));
});

test('cognitive layer principle — no WMS business rules execution', () => {
  assert.equal(CL_LAYER_PRINCIPLE.executesOperations, false);
  assert.equal(CL_LAYER_PRINCIPLE.noWmsBusinessRules, true);
  assert.equal(CL_LAYER_PRINCIPLE.consumesOPM007Intelligence, true);
  assert.ok(CL_COGNITIVE_INVARIANTS.length >= 7);
});

test('foundation hook is read-only — consumes OPM-007 pipeline', () => {
  const hook = fs.readFileSync(path.join(CL, 'useCognitiveLogisticsFoundation.js'), 'utf8');
  assert.ok(hook.includes('computeWiHeatmaps'));
  assert.ok(hook.includes('computeCognitiveRecommendations'));
  assert.ok(hook.includes('OPM-007'));
  assert.ok(!hook.includes('createMovement'));
  assert.ok(!hook.includes('createTransfer'));
  assert.ok(!hook.includes('dispatchShipping'));
});

test('heuristic rules catalog defined', () => {
  assert.ok(CL_HEURISTIC_RULES.length >= 6);
  for (const r of CL_HEURISTIC_RULES) {
    assert.ok(r.id.startsWith('RULE-'));
    assert.ok(r.confidenceBase > 0);
  }
});

test('data consumption contracts include OPM-007 and OPM-GOV-001', () => {
  assert.equal(CL_DATA_CONSUMPTION_CONTRACTS.warehouseIntelligence.phase, 'OPM-007');
  assert.equal(CL_DATA_CONSUMPTION_CONTRACTS.opmGov001.phase, 'OPM-GOV-001');
  for (const key of ['inventory', 'receiving', 'picking', 'shipping', 'transfers']) {
    assert.equal(CL_DATA_CONSUMPTION_CONTRACTS[key].mode, 'read_only');
  }
});

test('inventory integration contract cognitiveLogistics active', () => {
  assert.equal(INVENTORY_INTEGRATION_CONTRACTS.cognitiveLogistics.status, 'active');
  assert.equal(INVENTORY_INTEGRATION_CONTRACTS.cognitiveLogistics.targetPhase, 'OPM-008');
});

test('cognitive dashboard KPIs include health and risk scores', () => {
  const bundle = computeClDashboardKpis({
    wiKpis: [{ id: 'efficiency', value: '85%' }],
    capacity: [{ occupancy_pct: 92, critical: true, trend: 'saturation_risk' }],
    flow: { summary: { totalOpenQueues: 12 } },
    bottlenecks: [{ severity: 'high' }],
    snapshot: { receiving: [{ metadata: { sla_breach: true } }], picking: [], shipping: [], transfers: [], movements: [] }
  });
  assert.ok(bundle.items.some((k) => k.id === 'health_score'));
  assert.ok(bundle.items.some((k) => k.id === 'operational_risk'));
  assert.ok(typeof bundle.healthScore === 'number');
  assert.ok(typeof bundle.riskScore === 'number');
});

test('predictive insights from heuristics', () => {
  const insights = computePredictiveInsights({
    capacity: [{ warehouse_id: 'w1', warehouse: 'WH01', occupancy_pct: 95, critical: true, trend: 'saturation_risk' }],
    flow: { summary: { totalOpenQueues: 10 } },
    bottlenecks: [],
    heatmaps: { congested: [{ id: 'Z1', count: 12, level: 'high' }] },
    snapshot: { receiving: [{ metadata: { sla_breach: true } }], picking: [], shipping: [] }
  });
  assert.ok(insights.length >= 2);
  for (const i of insights) {
    assert.ok(i.ruleId);
    assert.ok(i.confidence > 0);
    assert.ok(i.evidence?.length);
  }
});

test('recommendation engine produces advisory traceable recs', () => {
  const recs = computeCognitiveRecommendations({
    wiRecommendations: [{ id: 'wi1', type: 'capacity', priority: 'high', title: 'Cap', message: 'x', trace: { source: 'wi' } }],
    insights: [{ id: 'ins1', severity: 'high', title: 'Pred', message: 'y', ruleId: 'RULE-CAP-SAT', confidence: 0.9, modules: ['warehouses'], evidence: [] }],
    capacity: [{ critical: true, warehouse_id: 'w1' }],
    heatmaps: { underused: [{ id: 'Z9', count: 0 }] },
    bottlenecks: [{ module: 'picking', moduleLabel: 'Picking', severity: 'high', hint: 'Filas', trace: { source: 'GET /v1/picking' } }],
    flow: { stages: [{ id: 'receiving', open: 5 }, { id: 'shipping', open: 4 }], summary: { totalOpenQueues: 9 } },
    transfers: [{ status: 'open' }, { status: 'open' }, { status: 'open' }]
  });
  assert.ok(recs.length >= 3);
  for (const r of recs) {
    assert.equal(r.action, 'advisory');
    assert.ok(r.confidence != null);
    assert.ok(r.decisionTrace);
  }
});

test('decision trace chain Recommendation → Contracts', () => {
  const rec = {
    id: 'r1',
    title: 'Test',
    priority: 'high',
    confidence: 0.85,
    impact: 'high',
    trace: { source: 'clRecommendationEngine' },
    modules: ['picking']
  };
  const trace = buildDecisionTrace({
    recommendation: { _recommendation: rec },
    snapshot: { receiving: [{}], movements: [{}] },
    wiAnalytics: { healthScore: 70, riskScore: 30, flow: { summary: {} }, capacity: [] }
  });
  assert.ok(trace.recommendation);
  assert.ok(trace.contracts.includes('OPM-GOV-001'));
  assert.ok(trace.contracts.includes('OPM-007'));
  assert.ok(trace.events.length >= 1);
});

test('insight trace for predictive items', () => {
  const trace = buildInsightTrace({
    id: 'i1',
    title: 'Sat',
    severity: 'high',
    confidence: 0.9,
    category: 'capacity',
    ruleId: 'RULE-CAP-SAT',
    horizon: '7d',
    modules: ['warehouses'],
    evidence: [{ type: 'metric', key: 'x', value: 1 }]
  });
  assert.equal(trace.recommendation.action, 'predictive_advisory');
  assert.ok(trace.evidence.length);
});

test('scenario simulation has no side effects', () => {
  assert.ok(CL_SCENARIO_CATALOG.length >= 4);
  const result = runScenarioSimulation('rcv_volume_up_20', {
    snapshot: { receiving: [{}, {}, {}], picking: [] },
    wiAnalytics: { capacity: [], flow: { summary: { totalOpenQueues: 5 } }, healthScore: 80, riskScore: 20, receiving: [{}, {}, {}], picking: [] }
  });
  assert.equal(result.sideEffects, false);
  assert.equal(result.advisory, true);
  assert.ok(result.projected.health <= result.baseline.health || result.projected.risk >= result.baseline.risk);
});

test('unified cognitive timeline merges operational and cognitive events', () => {
  const events = buildClUnifiedTimeline({
    snapshot: {
      receiving: [{ id: 'r1', order_number: 'R1', created_at: new Date().toISOString(), status: 'open', metadata: {} }],
      movements: [],
      picking: [],
      shipping: [],
      transfers: []
    },
    insights: [{ id: 'i1', severity: 'medium', title: 'Pred insight' }],
    recommendations: [{ id: 'c1', priority: 'high', title: 'Cog rec', source: 'OPM-007' }]
  });
  assert.ok(events.some((e) => e.category === 'operational'));
  assert.ok(events.some((e) => e.category === 'predictive' || e.category === 'cognitive' || e.category === 'analytical'));
});

test('cognitive recommendation rows include confidence and modules', () => {
  const rows = buildCognitiveRecommendationRows([
    { id: 'r1', priority: 'high', type: 'redistribution', title: 'Redist', confidence: 0.87, impact: 'high', modulesInvolved: ['transfers'], trace: { source: 'cl' } }
  ]);
  assert.equal(rows[0].confidence, '87%');
  assert.ok(rows[0].modules.includes('transfers'));
});

test('observability COGNITIVE_* events defined', () => {
  for (const ev of ['DASHBOARD_LOADED', 'INSIGHT_GENERATED', 'RECOMMENDATION_OPENED', 'SCENARIO_EXECUTED', 'TRACE_VIEWED', 'EXPORT']) {
    assert.ok(CL_EVENTS[ev], ev);
  }
});

test('EOX breadcrumb cognitive logistics phase OPM-008', () => {
  const cfg = resolveLogisticsOperationalNavigation('/app/logistics/cognitive-logistics');
  assert.equal(cfg.module, 'Logística Cognitiva');
  assert.equal(cfg.phase, 'OPM-008');
});

test('WMS-REF-001 reuse matrix requires cognitive components', () => {
  for (const c of ['InventoryDashboard', 'InventoryGrid', 'InventoryTimeline', 'InventoryExport']) {
    const req = getReuseRequirement('cognitive_logistics', c);
    assert.equal(req.reuse, 'required');
  }
});

test('certified modules OPM-003–007 unchanged', () => {
  assert.ok(read('domains/logistics-operational/pages/standalone/WarehouseIntelligenceModulePage.jsx').includes('WarehouseIntelligenceModule'));
  assert.ok(read('domains/logistics-operational/pages/standalone/TransferModulePage.jsx').includes('TransferOperationalModule'));
  assert.ok(read('domains/logistics-operational/pages/standalone/ShippingModulePage.jsx').includes('ShippingOperationalModule'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
