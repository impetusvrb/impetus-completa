'use strict';

/**
 * AIOI-P3.4 — Enterprise Value Governance Service (READ ONLY)
 *
 * Score composto: utilization + alignment + coverage + readiness.
 */

const { isValidUUID } = require('../../utils/security');
const vgMetrics = require('./aioiValueGovernanceMetrics');
const utilizationService = require('./aioiIntelligenceUtilizationService');
const alignmentService = require('./aioiOutcomeAlignmentService');
const coverageService = require('./aioiValueCoverageService');
const readinessReadModel = require('./aioiReadinessReadModelService');

const VALUE_GOVERNANCE_WEIGHTS = Object.freeze({
  utilization: 0.25,
  alignment:   0.25,
  coverage:    0.25,
  readiness:   0.25
});

function computeValueGovernanceScore({ utilizationScore, alignmentScore, coverageScore, readinessScore }) {
  const raw =
    (utilizationScore ?? 50) * VALUE_GOVERNANCE_WEIGHTS.utilization +
    (alignmentScore ?? 50) * VALUE_GOVERNANCE_WEIGHTS.alignment +
    (coverageScore ?? 50) * VALUE_GOVERNANCE_WEIGHTS.coverage +
    (readinessScore ?? 50) * VALUE_GOVERNANCE_WEIGHTS.readiness;
  return vgMetrics.clampScore(raw);
}

function buildEnterpriseValueGovernance(signals) {
  const value_governance_score = computeValueGovernanceScore(signals);
  return {
    value_governance_score,
    value_governance_level: vgMetrics.classifyValueGovernanceLevel(value_governance_score)
  };
}

async function getEnterpriseValueGovernance(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [utilRes, alignRes, covRes, readyRes] = await Promise.all([
      utilizationService.getIntelligenceUtilization(companyId),
      alignmentService.getOutcomeAlignment(companyId),
      coverageService.getValueCoverage(companyId),
      readinessReadModel.getReadinessReadModel(companyId)
    ]);

    const failures = [utilRes, alignRes, covRes, readyRes].filter(r => !r.ok);
    if (failures.length) {
      vgMetrics.recordError(companyId, 'getEnterpriseValueGovernance', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    const enterprise_value_governance = buildEnterpriseValueGovernance({
      utilizationScore: utilRes.intelligence_utilization.utilization_score,
      alignmentScore:   alignRes.outcome_alignment.alignment_score,
      coverageScore:    covRes.value_coverage.coverage_score,
      readinessScore:   readyRes.readiness_read_model.enterprise_scale_readiness?.enterprise_readiness_score
    });

    vgMetrics.recordValueGovernanceAnalyzed(companyId);
    return { ok: true, enterprise_value_governance };

  } catch (err) {
    vgMetrics.recordError(companyId, 'getEnterpriseValueGovernance', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  VALUE_GOVERNANCE_WEIGHTS,
  computeValueGovernanceScore,
  buildEnterpriseValueGovernance,
  getEnterpriseValueGovernance
};
