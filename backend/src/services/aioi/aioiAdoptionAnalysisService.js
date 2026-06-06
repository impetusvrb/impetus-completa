'use strict';

/**
 * AIOI-P3.3 — Adoption Analysis Service (READ ONLY)
 *
 * Evidências de utilização dos domínios via composição P3.2 — sem reimplementação.
 */

const { isValidUUID } = require('../../utils/security');
const readinessMetrics = require('./aioiReadinessMetrics');
const auditabilityReadModel = require('./aioiAuditabilityReadModelService');

const ADOPTION_DOMAINS = Object.freeze([
  'governance', 'predictive', 'strategic', 'resilience', 'trust', 'assurance', 'auditability'
]);

function _domainAdopted(arm, domain) {
  const assurance = arm?.assurance_read_model;
  const cmd = assurance?.trust_read_model?.executive_command_read_model;

  switch (domain) {
    case 'governance':
      return !!cmd?.governance_read_model;
    case 'predictive':
      return !!cmd?.predictive_read_model;
    case 'strategic':
      return !!cmd?.strategic_read_model;
    case 'resilience':
      return !!cmd?.resilience_read_model;
    case 'trust':
      return assurance?.trust_read_model?.intelligence_trust?.trust_score != null;
    case 'assurance':
      return assurance?.intelligence_assurance?.assurance_score != null;
    case 'auditability':
      return arm?.enterprise_auditability?.auditability_score != null;
    default:
      return false;
  }
}

function computeAdoptionScore(arm) {
  let adopted = 0;
  for (const domain of ADOPTION_DOMAINS) {
    if (_domainAdopted(arm, domain)) adopted++;
  }

  let score = Math.round((adopted / ADOPTION_DOMAINS.length) * 85);

  const trust = arm?.assurance_read_model?.trust_read_model?.intelligence_trust?.trust_score;
  if (trust >= 70) score += 8;
  else if (trust >= 40) score += 4;

  const audit = arm?.enterprise_auditability?.auditability_score;
  if (audit >= 70) score += 7;
  else if (audit >= 40) score += 3;

  return readinessMetrics.clampScore(score);
}

function buildAdoptionAnalysis(arm) {
  const adoption_score = computeAdoptionScore(arm);
  return {
    adoption_score,
    adoption_status: readinessMetrics.classifyAdoptionStatus(adoption_score)
  };
}

async function getAdoptionAnalysis(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const auditRes = await auditabilityReadModel.getAuditabilityReadModel(companyId);
    if (!auditRes.ok) {
      readinessMetrics.recordError(companyId, 'getAdoptionAnalysis', auditRes.error);
      return { ok: false, error: auditRes.error };
    }

    const adoption_analysis = buildAdoptionAnalysis(auditRes.auditability_read_model);
    readinessMetrics.recordAdoptionAnalyzed(companyId);
    return { ok: true, adoption_analysis };

  } catch (err) {
    readinessMetrics.recordError(companyId, 'getAdoptionAnalysis', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  ADOPTION_DOMAINS,
  computeAdoptionScore,
  buildAdoptionAnalysis,
  getAdoptionAnalysis
};
