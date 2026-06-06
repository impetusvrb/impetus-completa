'use strict';

/**
 * AIOI-P3.1 — Evidence Analysis Service (READ ONLY)
 *
 * Mapeia evidências que sustentam read models P2.1–P3.0 — composição, sem reimplementação.
 */

const { isValidUUID } = require('../../utils/security');
const expMetrics = require('./aioiExplainabilityMetrics');
const trustReadModel = require('./aioiTrustReadModelService');

const EVIDENCE_DOMAINS = Object.freeze([
  'governance', 'predictive', 'maturity', 'strategic',
  'resilience', 'digital_twin', 'executive_command', 'trust'
]);

function _domainEvidencePresent(domain, trustModel, dataIntegrity) {
  const cmd = trustModel.executive_command_read_model;
  const di = dataIntegrity;

  switch (domain) {
    case 'governance':
      return !!(cmd?.governance_read_model && di?.integrity_score > 0);
    case 'predictive':
      return !!(cmd?.predictive_read_model);
    case 'maturity':
      return !!(cmd?.maturity_read_model);
    case 'strategic':
      return !!(cmd?.strategic_read_model);
    case 'resilience':
      return !!(cmd?.resilience_read_model);
    case 'digital_twin':
      return !!(cmd?.digital_twin_read_model?.operational_state);
    case 'executive_command':
      return !!(cmd?.executive_command_state);
    case 'trust':
      return !!(trustModel.intelligence_trust?.trust_score != null);
    default:
      return false;
  }
}

function computeEvidenceScore(trustModel) {
  const cmd = trustModel.executive_command_read_model;
  const di = trustModel.data_integrity;
  let present = 0;

  for (const domain of EVIDENCE_DOMAINS) {
    if (_domainEvidencePresent(domain, trustModel, di)) present++;
  }

  let score = Math.round((present / EVIDENCE_DOMAINS.length) * 85);

  if (di?.integrity_status === 'verified') score += 10;
  else if (di?.integrity_status === 'attention') score += 5;

  if (cmd?.executive_readiness?.readiness_score >= 60) score += 5;

  return expMetrics.clampScore(score);
}

function buildEvidenceAnalysis(trustModel) {
  const evidence_score = computeEvidenceScore(trustModel);
  return {
    evidence_score,
    evidence_status: expMetrics.classifyEvidenceStatus(evidence_score)
  };
}

async function getEvidenceAnalysis(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const trustRes = await trustReadModel.getTrustReadModel(companyId);
    if (!trustRes.ok) {
      expMetrics.recordError(companyId, 'getEvidenceAnalysis', trustRes.error);
      return { ok: false, error: trustRes.error };
    }

    const evidence_analysis = buildEvidenceAnalysis(trustRes.trust_read_model);
    expMetrics.recordEvidenceAnalyzed(companyId);
    return { ok: true, evidence_analysis };

  } catch (err) {
    expMetrics.recordError(companyId, 'getEvidenceAnalysis', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  EVIDENCE_DOMAINS,
  computeEvidenceScore,
  buildEvidenceAnalysis,
  getEvidenceAnalysis
};
