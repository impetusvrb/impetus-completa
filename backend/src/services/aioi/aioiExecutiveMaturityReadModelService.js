'use strict';

/**
 * AIOI-P2.3 — Executive Maturity Read Model Service (READ ONLY)
 *
 * Agregador da camada de maturidade + governance P2.1 + predictive P2.2.
 */

const { isValidUUID } = require('../../utils/security');
const matMetrics = require('./aioiMaturityMetrics');
const governanceReadModel = require('./aioiGovernanceReadModelService');
const predictiveReadModel = require('./aioiPredictiveGovernanceReadModelService');
const maturityService = require('./aioiMaturityAnalysisService');
const benchmarkService = require('./aioiBenchmarkAnalysisService');
const stabilityService = require('./aioiOperationalStabilityService');
const consistencyService = require('./aioiGovernanceConsistencyService');

async function getExecutiveMaturityReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  matMetrics.recordMaturityRequested(companyId);
  const startMs = Date.now();

  try {
    const [
      govRes,
      predRes,
      maturityRes,
      benchmarkRes,
      stabilityRes,
      consistencyRes
    ] = await Promise.all([
      governanceReadModel.getGovernanceReadModel(companyId),
      predictiveReadModel.getPredictiveGovernanceReadModel(companyId),
      maturityService.getOperationalMaturity(companyId),
      benchmarkService.getBenchmarkAnalysis(companyId),
      stabilityService.getOperationalStability(companyId),
      consistencyService.getGovernanceConsistency(companyId)
    ]);

    const failures = [govRes, predRes, maturityRes, benchmarkRes, stabilityRes, consistencyRes]
      .filter(r => !r.ok);
    if (failures.length > 0) {
      matMetrics.recordError(companyId, 'getExecutiveMaturityReadModel', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    matMetrics.recordMaturityCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      executive_maturity_read_model: {
        governance_read_model:    govRes.governance_read_model,
        predictive_read_model:    predRes.predictive_governance_read_model,
        maturity:                 maturityRes.maturity,
        benchmark:                benchmarkRes.benchmark,
        stability:                stabilityRes.stability,
        governance_consistency:   consistencyRes.governance_consistency
      }
    };

  } catch (err) {
    matMetrics.recordError(companyId, 'getExecutiveMaturityReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getExecutiveMaturityReadModel
};
