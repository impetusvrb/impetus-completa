'use strict';

/**
 * Camada de conformidade — motor LGPD/ISO após resposta adaptativa e registo de incidentes comportamentais.
 */

const aiComplianceEngine = require('../../services/aiComplianceEngine');
const aiAnalytics = require('../../services/aiAnalyticsService');
const behavioralIntelligenceService = require('../../services/behavioralIntelligenceService');

/**
 * @param {object} ctx
 * @returns {Promise<{ compliancePack: object }>}
 */
async function applyComplianceAfterExecution(ctx) {
  const {
    traceId,
    user,
    synthesis,
    dossier,
    sanitized,
    data,
    module,
    adaptiveResponseMode,
    effectivePolicyBundle,
    AI_POLICY_ENGINE_ON
  } = ctx;

  const contextSnapshot = aiAnalytics.summarizeDossierData(data);
  const compliancePack = await aiComplianceEngine.processAfterAdaptive({
    traceId,
    user,
    synthesis,
    dossier,
    sanitized,
    contextSnapshot,
    module: module || 'cognitive_council',
    adaptiveResponseMode,
    policyRules:
      AI_POLICY_ENGINE_ON &&
      effectivePolicyBundle &&
      effectivePolicyBundle.rules &&
      typeof effectivePolicyBundle.rules === 'object'
        ? effectivePolicyBundle.rules
        : undefined
  });
  const prevExpl =
    synthesis.explanation_layer && typeof synthesis.explanation_layer === 'object'
      ? synthesis.explanation_layer
      : {};
  synthesis.explanation_layer = { ...prevExpl, compliance: compliancePack.compliance };

  if (user?.company_id && user?.id && compliancePack.compliance_incident) {
    behavioralIntelligenceService.trackUserAction('INCIDENT_GENERATED', {
      userId: user.id,
      companyId: user.company_id,
      traceId,
      kind: 'compliance',
      module: module || 'cognitive_council'
    });
  }

  return { compliancePack, contextSnapshot };
}

module.exports = {
  applyComplianceAfterExecution
};
