'use strict';

/**
 * AIOI-P3.3 — Governance Readiness Service (READ ONLY)
 *
 * Avalia governance coverage, compliance, assurance e auditability via P3.2.
 */

const { isValidUUID } = require('../../utils/security');
const readinessMetrics = require('./aioiReadinessMetrics');
const auditabilityReadModel = require('./aioiAuditabilityReadModelService');

const GOVERNANCE_READINESS_FACTORS = Object.freeze([
  'governance_coverage', 'compliance', 'assurance', 'auditability'
]);

function _extractGovernanceScores(arm) {
  return {
    governance_coverage: arm?.governance_coverage?.governance_score ?? null,
    compliance:          arm?.intelligence_compliance?.compliance_score ?? null,
    assurance:           arm?.assurance_read_model?.intelligence_assurance?.assurance_score ?? null,
    auditability:        arm?.enterprise_auditability?.auditability_score ?? null
  };
}

function computeGovernanceReadinessScore(arm) {
  const factors = _extractGovernanceScores(arm);
  const values = GOVERNANCE_READINESS_FACTORS.map(k => factors[k]).filter(v => v != null);

  if (!values.length) return 30;

  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  return readinessMetrics.clampScore(avg);
}

function buildGovernanceReadiness(arm) {
  const governance_readiness_score = computeGovernanceReadinessScore(arm);
  return {
    governance_readiness_score,
    governance_readiness_status: readinessMetrics.classifyGovernanceReadinessStatus(
      governance_readiness_score
    )
  };
}

async function getGovernanceReadiness(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const auditRes = await auditabilityReadModel.getAuditabilityReadModel(companyId);
    if (!auditRes.ok) {
      readinessMetrics.recordError(companyId, 'getGovernanceReadiness', auditRes.error);
      return { ok: false, error: auditRes.error };
    }

    const governance_readiness = buildGovernanceReadiness(auditRes.auditability_read_model);
    readinessMetrics.recordGovernanceReadinessAnalyzed(companyId);
    return { ok: true, governance_readiness };

  } catch (err) {
    readinessMetrics.recordError(companyId, 'getGovernanceReadiness', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  GOVERNANCE_READINESS_FACTORS,
  computeGovernanceReadinessScore,
  buildGovernanceReadiness,
  getGovernanceReadiness
};
