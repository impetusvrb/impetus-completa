/**
 * CPL-002 — Environment Cognitive Adapter (thin).
 * Encapsula environmentCognitive API + cognitive-runtime workspaces — sem alterar domínio.
 */
import { createCognitiveAdapter } from '../../runtime/cognitiveAdapterRuntime.js';

const PROVIDER_PATHS = Object.freeze([
  'domains/environment/cognitive-runtime/EnvironmentCognitiveIntelligenceHub.jsx',
  'domains/environment/cognitive-runtime/EnvironmentRecommendationWorkspace.jsx',
  'domains/environment/cognitive-runtime/EnvironmentReasoningWorkspace.jsx',
  'services/api.js (environmentCognitive)',
  'cognitiveRuntime/domains/environmental/'
]);

export const environmentCognitiveAdapter = createCognitiveAdapter({
  id: 'environment_adapter',
  domain: 'environment',
  version: '1.0.0',
  providerPaths: PROVIDER_PATHS,
  contractIds: Object.freeze(['RecommendationProvider', 'DecisionTraceProvider', 'RiskProvider', 'InsightProvider']),
  capabilities: Object.freeze(['insights_endpoint', 'recommendations', 'reasoning', 'health_endpoint']),

  handlers: {
    insights_endpoint() {
      return {
        apiPath: '/environment-cognitive/insights/run',
        clientExport: 'environmentCognitive.runInsights',
        validationPath: '/environment-cognitive/validation/run'
      };
    },

    recommendations(ctx) {
      return ctx.pack?.recommendations || ctx.recommendations || [];
    },

    reasoning(ctx) {
      return {
        workspace: 'EnvironmentReasoningWorkspace',
        path: 'domains/environment/cognitive-runtime/EnvironmentReasoningWorkspace.jsx',
        chain: ctx.chain || null
      };
    },

    health_endpoint() {
      return {
        apiPath: '/environment-cognitive/health',
        clientExport: 'environmentCognitive.health'
      };
    },

    trace(ctx) {
      return {
        recommendation: { action: 'advisory', source: 'environment_cognitive' },
        evidence: ctx.evidence || [],
        metrics: { ecosystem_risk_score: ctx.ecosystem_risk_score },
        contracts: ['environment_operational'],
        modulesInvolved: ['environment']
      };
    }
  },

  healthProbe() {
    return {
      status: 'available',
      adapterId: 'environment_adapter',
      domain: 'environment',
      version: '1.0.0',
      providers: PROVIDER_PATHS
    };
  }
});

export default environmentCognitiveAdapter;
