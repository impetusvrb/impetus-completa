'use strict';

/**
 * AIOI-P3.4 — Value Governance Read Model Service (READ ONLY)
 *
 * Agregador da camada de value governance + read model P3.3.
 * Readiness obtido uma vez; capacidades P3.4 derivadas via Promise.all.
 */

const { isValidUUID } = require('../../utils/security');
const vgMetrics = require('./aioiValueGovernanceMetrics');
const readinessReadModel = require('./aioiReadinessReadModelService');
const utilizationService = require('./aioiIntelligenceUtilizationService');
const alignmentService = require('./aioiOutcomeAlignmentService');
const coverageService = require('./aioiValueCoverageService');
const enterpriseValueGovernanceService = require('./aioiEnterpriseValueGovernanceService');

async function getValueGovernanceReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  vgMetrics.recordValueGovernanceRequested(companyId);
  const startMs = Date.now();

  try {
    const readyRes = await readinessReadModel.getReadinessReadModel(companyId);
    if (!readyRes.ok) {
      vgMetrics.recordError(companyId, 'getValueGovernanceReadModel', readyRes.error);
      return { ok: false, error: readyRes.error };
    }

    const rrm = readyRes.readiness_read_model;

    const intelligence_utilization = utilizationService.buildIntelligenceUtilization(rrm);
    const value_coverage = coverageService.buildValueCoverage(rrm);

    const alignRes = await alignmentService.getOutcomeAlignment(companyId);
    if (!alignRes.ok) {
      vgMetrics.recordError(companyId, 'getValueGovernanceReadModel', alignRes.error);
      return { ok: false, error: alignRes.error };
    }

    const enterprise_value_governance = enterpriseValueGovernanceService.buildEnterpriseValueGovernance({
      utilizationScore: intelligence_utilization.utilization_score,
      alignmentScore:   alignRes.outcome_alignment.alignment_score,
      coverageScore:    value_coverage.coverage_score,
      readinessScore:   rrm.enterprise_scale_readiness?.enterprise_readiness_score
    });

    const [
      utilRes,
      covRes,
      alignWrap,
      govRes
    ] = await Promise.all([
      Promise.resolve({ ok: true, intelligence_utilization }),
      Promise.resolve({ ok: true, value_coverage }),
      Promise.resolve({ ok: true, outcome_alignment: alignRes.outcome_alignment }),
      Promise.resolve({ ok: true, enterprise_value_governance })
    ]);

    vgMetrics.recordUtilizationAnalyzed(companyId);
    vgMetrics.recordValueCoverageAnalyzed(companyId);
    vgMetrics.recordOutcomeAlignmentAnalyzed(companyId);
    vgMetrics.recordValueGovernanceAnalyzed(companyId);
    vgMetrics.recordValueGovernanceCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      value_governance_read_model: {
        readiness_read_model:         rrm,
        intelligence_utilization:     utilRes.intelligence_utilization,
        outcome_alignment:            alignWrap.outcome_alignment,
        value_coverage:               covRes.value_coverage,
        enterprise_value_governance:  govRes.enterprise_value_governance
      }
    };

  } catch (err) {
    vgMetrics.recordError(companyId, 'getValueGovernanceReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getValueGovernanceReadModel
};
