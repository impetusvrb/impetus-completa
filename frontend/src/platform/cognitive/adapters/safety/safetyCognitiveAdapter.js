/**
 * CPL-002 — Safety Cognitive Adapter (thin).
 * Encapsula safetyCognitivePressureAnalyzer + SafetyCognitiveHub API — sem alterar domínio.
 */
import { createCognitiveAdapter } from '../../runtime/cognitiveAdapterRuntime.js';
import { analyzeSafetyCognitivePressure } from '../../../../domains/safety/analytics/safetyCognitivePressureAnalyzer.js';

const PROVIDER_PATHS = Object.freeze([
  'domains/safety/cognitive/SafetyCognitiveHub.jsx',
  'domains/safety/analytics/safetyCognitivePressureAnalyzer.js',
  'cognitiveRuntime/domains/sst/'
]);

export const safetyCognitiveAdapter = createCognitiveAdapter({
  id: 'safety_adapter',
  domain: 'safety',
  version: '1.0.0',
  providerPaths: PROVIDER_PATHS,
  contractIds: Object.freeze(['RecommendationProvider', 'RiskProvider', 'InsightProvider']),
  capabilities: Object.freeze(['pressure_analysis', 'insights_endpoint', 'recommendations', 'health_endpoint']),

  handlers: {
    pressure_analysis(ctx) {
      return analyzeSafetyCognitivePressure(ctx.input || {});
    },

    insights_endpoint() {
      return {
        apiPath: '/safety-cognitive/insights',
        method: 'POST',
        note: 'Delegated to SafetyCognitiveHub — adapter does not execute API'
      };
    },

    recommendations(ctx) {
      return ctx.pack?.recommendations?.recommendations || ctx.pack?.recommendations || [];
    },

    health_endpoint() {
      return {
        hubComponent: 'domains/safety/cognitive/SafetyCognitiveHub.jsx',
        runtimePath: 'cognitiveRuntime/domains/sst/safetyCockpitRuntime.js'
      };
    },

    trace(ctx) {
      const pressure = analyzeSafetyCognitivePressure(ctx.input || {});
      return {
        recommendation: { action: 'advisory', source: 'safety_cognitive' },
        evidence: [{ type: 'pressure_analysis', ...pressure }],
        metrics: { cognitive_risk_score: pressure.cognitive_risk_score },
        contracts: ['safety_operational'],
        modulesInvolved: ['safety']
      };
    }
  },

  healthProbe() {
    return {
      status: 'available',
      adapterId: 'safety_adapter',
      domain: 'safety',
      version: '1.0.0',
      providers: PROVIDER_PATHS
    };
  }
});

export default safetyCognitiveAdapter;
