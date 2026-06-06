'use strict';

/**
 * AIOI-P3.3 — Operational Readiness Service (READ ONLY)
 *
 * Consome Maturity, Resilience, Trust e Auditability via read model P3.2.
 */

const { isValidUUID } = require('../../utils/security');
const readinessMetrics = require('./aioiReadinessMetrics');
const auditabilityReadModel = require('./aioiAuditabilityReadModelService');

const READINESS_PILLARS = Object.freeze(['maturity', 'resilience', 'trust', 'auditability']);

function _extractPillarScores(arm) {
  const assurance = arm?.assurance_read_model;
  const cmd = assurance?.trust_read_model?.executive_command_read_model;

  return {
    maturity:     cmd?.maturity_read_model?.maturity?.score ?? null,
    resilience:   cmd?.resilience_read_model?.operational_resilience?.resilience_score ?? null,
    trust:        assurance?.trust_read_model?.intelligence_trust?.trust_score ?? null,
    auditability: arm?.enterprise_auditability?.auditability_score ?? null
  };
}

function computeOperationalReadinessScore(arm) {
  const pillars = _extractPillarScores(arm);
  const values = READINESS_PILLARS.map(k => pillars[k]).filter(v => v != null);

  if (!values.length) return 30;

  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  return readinessMetrics.clampScore(avg);
}

function buildOperationalReadiness(arm) {
  const readiness_score = computeOperationalReadinessScore(arm);
  return {
    readiness_score,
    readiness_status: readinessMetrics.classifyReadinessStatus(readiness_score)
  };
}

async function getOperationalReadiness(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const auditRes = await auditabilityReadModel.getAuditabilityReadModel(companyId);
    if (!auditRes.ok) {
      readinessMetrics.recordError(companyId, 'getOperationalReadiness', auditRes.error);
      return { ok: false, error: auditRes.error };
    }

    const operational_readiness = buildOperationalReadiness(auditRes.auditability_read_model);
    readinessMetrics.recordOperationalReadinessAnalyzed(companyId);
    return { ok: true, operational_readiness };

  } catch (err) {
    readinessMetrics.recordError(companyId, 'getOperationalReadiness', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  READINESS_PILLARS,
  computeOperationalReadinessScore,
  buildOperationalReadiness,
  getOperationalReadiness
};
