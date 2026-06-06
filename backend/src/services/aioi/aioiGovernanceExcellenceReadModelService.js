'use strict';

/**
 * AIOI-P3.8 — Governance Excellence Read Model Service (READ ONLY)
 *
 * Agregador P3.7 + capacidades P3.8 — getConformanceReadModel uma única vez.
 */

const { isValidUUID } = require('../../utils/security');
const govMetrics = require('./aioiGovernanceExcellenceMetrics');
const conformanceReadModel = require('./aioiConformanceReadModelService');
const maturityService = require('./aioiGovernanceMaturityService');
const consistencyService = require('./aioiExcellenceGovernanceConsistencyService');
const coverageService = require('./aioiGovernanceExcellenceCoverageService');
const enterpriseExcellenceService = require('./aioiEnterpriseGovernanceExcellenceService');

async function getGovernanceExcellenceReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  govMetrics.recordGovernanceExcellenceRequested(companyId);
  const startMs = Date.now();

  try {
    const confRes = await conformanceReadModel.getConformanceReadModel(companyId);
    if (!confRes.ok) {
      govMetrics.recordError(companyId, 'getGovernanceExcellenceReadModel', confRes.error);
      return { ok: false, error: confRes.error };
    }

    const confRm = confRes.conformance_read_model;
    const signals = govMetrics._extractGovernanceSignals(confRm);

    const governance_maturity = maturityService.buildGovernanceMaturity(confRm);
    const governance_consistency = consistencyService.buildGovernanceConsistency(confRm);
    const governance_excellence_coverage = coverageService.buildGovernanceExcellenceCoverage(confRm);

    const enterprise_governance_excellence = enterpriseExcellenceService.buildEnterpriseGovernanceExcellence({
      maturityScore:              governance_maturity.maturity_score,
      consistencyScore:           governance_consistency.consistency_score,
      coverageScore:              governance_excellence_coverage.coverage_score,
      enterpriseConformanceScore: signals.enterpriseConformanceScore
    });

    const [
      maturityRes,
      consistencyRes,
      coverageRes,
      enterpriseRes
    ] = await Promise.all([
      Promise.resolve({ ok: true, governance_maturity }),
      Promise.resolve({ ok: true, governance_consistency }),
      Promise.resolve({ ok: true, governance_excellence_coverage }),
      Promise.resolve({ ok: true, enterprise_governance_excellence })
    ]);

    govMetrics.recordGovernanceMaturityAnalyzed(companyId);
    govMetrics.recordGovernanceConsistencyAnalyzed(companyId);
    govMetrics.recordGovernanceCoverageAnalyzed(companyId);
    govMetrics.recordEnterpriseGovernanceAnalyzed(companyId);
    govMetrics.recordGovernanceExcellenceCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      governance_excellence_read_model: {
        conformance_read_model:            confRm,
        governance_maturity:               maturityRes.governance_maturity,
        governance_consistency:            consistencyRes.governance_consistency,
        governance_excellence_coverage:      coverageRes.governance_excellence_coverage,
        enterprise_governance_excellence:    enterpriseRes.enterprise_governance_excellence
      }
    };

  } catch (err) {
    govMetrics.recordError(companyId, 'getGovernanceExcellenceReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getGovernanceExcellenceReadModel
};
