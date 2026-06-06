'use strict';

/**
 * AIOI-P3.3 — Enterprise Scale Readiness Service (READ ONLY)
 *
 * Score composto: adoption + operational readiness + governance readiness + trust.
 */

const { isValidUUID } = require('../../utils/security');
const readinessMetrics = require('./aioiReadinessMetrics');
const adoptionService = require('./aioiAdoptionAnalysisService');
const operationalReadinessService = require('./aioiOperationalReadinessService');
const governanceReadinessService = require('./aioiGovernanceReadinessService');
const trustService = require('./aioiIntelligenceTrustService');

const ENTERPRISE_READINESS_WEIGHTS = Object.freeze({
  adoption:    0.25,
  operational: 0.25,
  governance:  0.25,
  trust:       0.25
});

function computeEnterpriseReadinessScore({ adoptionScore, operationalScore, governanceScore, trustScore }) {
  const raw =
    (adoptionScore ?? 50) * ENTERPRISE_READINESS_WEIGHTS.adoption +
    (operationalScore ?? 50) * ENTERPRISE_READINESS_WEIGHTS.operational +
    (governanceScore ?? 50) * ENTERPRISE_READINESS_WEIGHTS.governance +
    (trustScore ?? 50) * ENTERPRISE_READINESS_WEIGHTS.trust;
  return readinessMetrics.clampScore(raw);
}

function buildEnterpriseScaleReadiness(signals) {
  const enterprise_readiness_score = computeEnterpriseReadinessScore(signals);
  return {
    enterprise_readiness_score,
    enterprise_readiness_level: readinessMetrics.classifyEnterpriseReadinessLevel(
      enterprise_readiness_score
    )
  };
}

async function getEnterpriseScaleReadiness(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [adoptionRes, operationalRes, governanceRes, trustRes] = await Promise.all([
      adoptionService.getAdoptionAnalysis(companyId),
      operationalReadinessService.getOperationalReadiness(companyId),
      governanceReadinessService.getGovernanceReadiness(companyId),
      trustService.getIntelligenceTrust(companyId)
    ]);

    const failures = [adoptionRes, operationalRes, governanceRes, trustRes].filter(r => !r.ok);
    if (failures.length) {
      readinessMetrics.recordError(companyId, 'getEnterpriseScaleReadiness', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    const enterprise_scale_readiness = buildEnterpriseScaleReadiness({
      adoptionScore:    adoptionRes.adoption_analysis.adoption_score,
      operationalScore: operationalRes.operational_readiness.readiness_score,
      governanceScore:  governanceRes.governance_readiness.governance_readiness_score,
      trustScore:       trustRes.intelligence_trust.trust_score
    });

    readinessMetrics.recordEnterpriseReadinessAnalyzed(companyId);
    return { ok: true, enterprise_scale_readiness };

  } catch (err) {
    readinessMetrics.recordError(companyId, 'getEnterpriseScaleReadiness', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  ENTERPRISE_READINESS_WEIGHTS,
  computeEnterpriseReadinessScore,
  buildEnterpriseScaleReadiness,
  getEnterpriseScaleReadiness
};
