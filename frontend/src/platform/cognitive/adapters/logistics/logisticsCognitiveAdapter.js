/**
 * CPL-002 — Logistics Cognitive Adapter (thin).
 * Delega OPM-007 + OPM-008 — zero alterações WMS.
 */
import { createCognitiveAdapter } from '../../runtime/cognitiveAdapterRuntime.js';
import { computeWiHeatmaps } from '../../../../domains/logistics-operational/modules/warehouse-intelligence/wiHeatmapUtils.js';
import { computeWiCapacityAnalytics } from '../../../../domains/logistics-operational/modules/warehouse-intelligence/wiCapacityUtils.js';
import { computeWiBottlenecks } from '../../../../domains/logistics-operational/modules/warehouse-intelligence/wiBottleneckUtils.js';
import { computeWiFlowAnalytics } from '../../../../domains/logistics-operational/modules/warehouse-intelligence/wiFlowAnalyticsUtils.js';
import { computeWiRecommendations } from '../../../../domains/logistics-operational/modules/warehouse-intelligence/wiRecommendationUtils.js';
import { computePredictiveInsights } from '../../../../domains/logistics-operational/modules/cognitive-logistics/clPredictiveUtils.js';
import { computeCognitiveRecommendations } from '../../../../domains/logistics-operational/modules/cognitive-logistics/clRecommendationEngine.js';
import { buildDecisionTrace, buildInsightTrace } from '../../../../domains/logistics-operational/modules/cognitive-logistics/clDecisionTrace.js';
import { runScenarioSimulation, CL_SCENARIO_CATALOG } from '../../../../domains/logistics-operational/modules/cognitive-logistics/clScenarioUtils.js';
import { computeClDashboardKpis } from '../../../../domains/logistics-operational/modules/cognitive-logistics/clKpiUtils.js';
import { computeWiDashboardKpis } from '../../../../domains/logistics-operational/modules/warehouse-intelligence/wiKpiUtils.js';

const PROVIDER_PATHS = Object.freeze([
  'domains/logistics-operational/modules/warehouse-intelligence/',
  'domains/logistics-operational/modules/cognitive-logistics/'
]);

function buildWiAnalytics(snapshot = {}) {
  const heatmaps = computeWiHeatmaps(snapshot);
  const capacity = computeWiCapacityAnalytics(snapshot);
  const bottlenecks = computeWiBottlenecks(snapshot);
  const flow = computeWiFlowAnalytics(snapshot);
  const wiKpis = computeWiDashboardKpis(snapshot);
  const wiRecommendations = computeWiRecommendations({
    heatmaps,
    capacity,
    bottlenecks,
    flow,
    transfers: snapshot.transfers || []
  });
  return { heatmaps, capacity, bottlenecks, flow, wiKpis, wiRecommendations, receiving: snapshot.receiving, picking: snapshot.picking };
}

function buildClAnalytics(snapshot = {}) {
  const wi = buildWiAnalytics(snapshot);
  const insights = computePredictiveInsights({ ...wi, snapshot });
  const recommendations = computeCognitiveRecommendations({
    wiRecommendations: wi.wiRecommendations,
    insights,
    capacity: wi.capacity,
    heatmaps: wi.heatmaps,
    bottlenecks: wi.bottlenecks,
    flow: wi.flow,
    transfers: snapshot.transfers || []
  });
  const kpiBundle = computeClDashboardKpis({ ...wi, wiKpis: wi.wiKpis.items, snapshot });
  return { ...wi, insights, recommendations, kpiBundle };
}

export const logisticsCognitiveAdapter = createCognitiveAdapter({
  id: 'logistics_adapter',
  domain: 'logistics_wms',
  version: '1.0.0',
  providerPaths: PROVIDER_PATHS,
  contractIds: Object.freeze([
    'RecommendationProvider',
    'DecisionTraceProvider',
    'ScenarioProvider',
    'InsightProvider',
    'RiskProvider',
    'TimelineProvider',
    'HeuristicProvider'
  ]),
  capabilities: Object.freeze(['insights', 'recommendations', 'simulation', 'trace', 'scenarios_catalog', 'health_kpi']),

  handlers: {
    insights(ctx) {
      const analytics = buildClAnalytics(ctx.snapshot || {});
      return analytics.insights;
    },

    recommendations(ctx) {
      const analytics = buildClAnalytics(ctx.snapshot || {});
      return analytics.recommendations;
    },

    trace(ctx) {
      const analytics = buildClAnalytics(ctx.snapshot || {});
      if (ctx.insight) return buildInsightTrace(ctx.insight);
      const rec = ctx.recommendation || analytics.recommendations?.[0];
      if (!rec) return null;
      return buildDecisionTrace({
        recommendation: { _recommendation: rec },
        snapshot: ctx.snapshot || {},
        wiAnalytics: {
          ...analytics,
          healthScore: analytics.kpiBundle?.healthScore,
          riskScore: analytics.kpiBundle?.riskScore
        }
      });
    },

    scenarios_catalog() {
      return CL_SCENARIO_CATALOG;
    },

    health_kpi(ctx) {
      const analytics = buildClAnalytics(ctx.snapshot || {});
      return {
        healthScore: analytics.kpiBundle?.healthScore,
        riskScore: analytics.kpiBundle?.riskScore
      };
    },

    simulate(scenarioId, ctx) {
      const analytics = buildClAnalytics(ctx.snapshot || {});
      return runScenarioSimulation(scenarioId, {
        snapshot: ctx.snapshot || {},
        wiAnalytics: {
          ...analytics,
          healthScore: analytics.kpiBundle?.healthScore,
          riskScore: analytics.kpiBundle?.riskScore
        }
      });
    }
  },

  healthProbe() {
    return {
      status: 'available',
      adapterId: 'logistics_adapter',
      domain: 'logistics_wms',
      version: '1.0.0',
      providers: PROVIDER_PATHS,
      opmPhases: ['OPM-007', 'OPM-008']
    };
  }
});

export default logisticsCognitiveAdapter;
