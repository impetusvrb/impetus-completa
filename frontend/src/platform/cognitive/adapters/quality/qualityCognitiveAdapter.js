/**
 * CPL-002 — Quality Cognitive Adapter (thin).
 * Encapsula qualityCognitiveRuntimeSignalAdapter + API qualityCognitive — sem alterar domínio.
 */
import { createCognitiveAdapter } from '../../runtime/cognitiveAdapterRuntime.js';
import {
  resolveQualityRuntimeContext,
  buildCognitiveSignalsFromRuntime,
  buildRuntimeInsightPack,
  hasSufficientSignalsForRunInsights,
  mergeRuntimeAndApiPacks
} from '../../../../domains/quality/cognitive/qualityCognitiveRuntimeSignalAdapter.js';

const PROVIDER_PATHS = Object.freeze([
  'domains/quality/cognitive/qualityCognitiveRuntimeSignalAdapter.js',
  'domains/quality/cognitive/CognitiveQualityHub.jsx',
  'services/api.js (qualityCognitive)'
]);

export const qualityCognitiveAdapter = createCognitiveAdapter({
  id: 'quality_adapter',
  domain: 'quality',
  version: '1.0.0',
  providerPaths: PROVIDER_PATHS,
  contractIds: Object.freeze(['RecommendationProvider', 'InsightProvider', 'RiskProvider', 'DecisionTraceProvider']),
  capabilities: Object.freeze(['insights', 'recommendations', 'signals', 'runtime_context', 'health_endpoint']),

  handlers: {
    runtime_context(ctx) {
      return resolveQualityRuntimeContext(ctx.meData || {});
    },

    signals(ctx) {
      return buildCognitiveSignalsFromRuntime(ctx.meData || {});
    },

    insights(ctx) {
      const pack = buildRuntimeInsightPack(ctx.meData || {});
      return {
        drift: pack.engines?.drift,
        supplier: pack.engines?.supplier,
        risk: pack.risk,
        narrative: pack.narrative,
        unavailable: pack.unavailable
      };
    },

    recommendations(ctx) {
      const pack = buildRuntimeInsightPack(ctx.meData || {});
      const merged = mergeRuntimeAndApiPacks(pack, ctx.apiPack || null);
      return merged.recommendations?.recommendations || [];
    },

    health_endpoint() {
      return {
        apiPath: '/quality-cognitive/health',
        runInsightsPath: '/quality-cognitive/insights/run',
        clientExport: 'qualityCognitive'
      };
    },

    trace(ctx) {
      const pack = buildRuntimeInsightPack(ctx.meData || {});
      return {
        recommendation: { action: 'advisory', source: 'quality_runtime' },
        evidence: [{ type: 'runtime_pack', unavailable: pack.unavailable }],
        metrics: { predictive_risk_score: pack.risk?.predictive_risk_score },
        contracts: ['OPM-GOV-001', 'quality_native_cockpit'],
        modulesInvolved: ['quality']
      };
    }
  },

  healthProbe() {
    return {
      status: 'available',
      adapterId: 'quality_adapter',
      domain: 'quality',
      version: '1.0.0',
      providers: PROVIDER_PATHS,
      signalsReady: typeof hasSufficientSignalsForRunInsights === 'function'
    };
  }
});

export default qualityCognitiveAdapter;
