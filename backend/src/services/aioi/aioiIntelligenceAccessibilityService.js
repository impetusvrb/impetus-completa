'use strict';

/**
 * AIOI-P4.2 — Intelligence Accessibility Service (READ ONLY)
 *
 * Cobertura de 22 domínios via getAutonomyReadModel (P4.1).
 */

const { isValidUUID } = require('../../utils/security');
const consumptionMetrics = require('./aioiConsumptionMetrics');
const autonomyReadModel = require('./aioiAutonomyReadModelService');

const ACCESSIBILITY_DOMAINS = Object.freeze([
  'governance', 'predictive', 'maturity', 'strategic', 'value', 'resilience',
  'scenario', 'digital_twin', 'executive_command', 'trust', 'assurance',
  'auditability', 'readiness', 'adoption', 'value_governance', 'sustainability',
  'certification', 'conformance', 'governance_excellence', 'institutionalization',
  'sovereignty', 'autonomy'
]);

function _domainCovered(arm, domain) {
  const srm = arm?.sovereignty_read_model;
  const irm = srm?.institutionalization_read_model;
  const germ = irm?.governance_excellence_read_model;
  const confRm = germ?.conformance_read_model;
  const crm = confRm?.certification_read_model;
  const srmNested = crm?.sustainability_read_model;
  const vgrm = srmNested?.value_governance_read_model;
  const rrm = vgrm?.readiness_read_model;
  const auditRm = rrm?.auditability_read_model;
  const cmd = auditRm?.assurance_read_model?.trust_read_model?.executive_command_read_model;

  switch (domain) {
    case 'governance':        return !!cmd?.governance_read_model;
    case 'predictive':        return !!cmd?.predictive_read_model;
    case 'maturity':          return !!(cmd?.maturity_read_model?.maturity || cmd?.maturity_read_model?.benchmark);
    case 'strategic':         return !!cmd?.strategic_read_model;
    case 'value':             return !!cmd?.value_read_model;
    case 'resilience':        return !!cmd?.resilience_read_model;
    case 'scenario':          return !!cmd?.scenario_read_model;
    case 'digital_twin':      return !!cmd?.digital_twin_read_model?.operational_state;
    case 'executive_command': return !!cmd?.executive_command_state;
    case 'trust':
      return auditRm?.assurance_read_model?.trust_read_model?.intelligence_trust?.trust_score != null;
    case 'assurance':
      return auditRm?.assurance_read_model?.intelligence_assurance?.assurance_score != null;
    case 'auditability':
      return auditRm?.enterprise_auditability?.auditability_score != null;
    case 'readiness':
      return rrm?.enterprise_scale_readiness?.enterprise_readiness_score != null;
    case 'adoption':
      return rrm?.adoption_analysis?.adoption_score != null;
    case 'value_governance':
      return vgrm?.enterprise_value_governance?.value_governance_score != null;
    case 'sustainability':
      return srmNested?.enterprise_sustainability?.enterprise_sustainability_score != null;
    case 'certification':
      return crm?.enterprise_certification?.certification_score != null;
    case 'conformance':
      return confRm?.intelligence_conformance?.conformance_score != null;
    case 'governance_excellence':
      return germ?.enterprise_governance_excellence?.governance_excellence_score != null;
    case 'institutionalization':
      return irm?.enterprise_institutionalization?.institutionalization_score != null;
    case 'sovereignty':
      return srm?.enterprise_sovereignty?.sovereignty_score != null;
    case 'autonomy':
      return arm?.enterprise_autonomy?.autonomy_score != null;
    default:
      return false;
  }
}

function computeIntelligenceAccessibilityScore(arm) {
  let covered = 0;
  for (const domain of ACCESSIBILITY_DOMAINS) {
    if (_domainCovered(arm, domain)) covered++;
  }
  return consumptionMetrics.clampScore(Math.round((covered / ACCESSIBILITY_DOMAINS.length) * 100));
}

function buildIntelligenceAccessibility(arm) {
  const accessibility_score = computeIntelligenceAccessibilityScore(arm);
  return {
    accessibility_score,
    accessibility_status: consumptionMetrics.classifyIntelligenceAccessibility(accessibility_score)
  };
}

async function getIntelligenceAccessibility(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const armRes = await autonomyReadModel.getAutonomyReadModel(companyId);
    if (!armRes.ok) {
      consumptionMetrics.recordError(companyId, 'getIntelligenceAccessibility', armRes.error);
      return { ok: false, error: armRes.error };
    }

    const intelligence_accessibility = buildIntelligenceAccessibility(armRes.autonomy_read_model);
    consumptionMetrics.recordIntelligenceAccessibilityAnalyzed(companyId);
    return { ok: true, intelligence_accessibility };

  } catch (err) {
    consumptionMetrics.recordError(companyId, 'getIntelligenceAccessibility', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  ACCESSIBILITY_DOMAINS,
  computeIntelligenceAccessibilityScore,
  buildIntelligenceAccessibility,
  getIntelligenceAccessibility
};
