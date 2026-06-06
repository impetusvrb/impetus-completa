'use strict';

/**
 * AIOI-P2.5 — Executive Value Read Model Service (READ ONLY)
 *
 * Agregador da camada de valor + read models P2.1–P2.4.
 */

const { isValidUUID } = require('../../utils/security');
const valueMetrics = require('./aioiValueMetrics');
const strategicReadModel = require('./aioiStrategicReadModelService');
const operationalValueService = require('./aioiOperationalValueService');
const riskImpactService = require('./aioiRiskImpactService');
const bottleneckCostService = require('./aioiBottleneckCostService');
const portfolioService = require('./aioiPortfolioAnalysisService');

async function getValueReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  valueMetrics.recordValueRequested(companyId);
  const startMs = Date.now();

  try {
    const [
      strategicRes,
      valueRes,
      riskRes,
      costRes,
      portfolioRes
    ] = await Promise.all([
      strategicReadModel.getStrategicReadModel(companyId),
      operationalValueService.getOperationalValue(companyId),
      riskImpactService.getRiskImpact(companyId),
      bottleneckCostService.getBottleneckCost(companyId),
      portfolioService.getPortfolioAnalysis(companyId)
    ]);

    const failures = [strategicRes, valueRes, riskRes, costRes, portfolioRes].filter(r => !r.ok);
    if (failures.length) {
      valueMetrics.recordError(companyId, 'getValueReadModel', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    const srm = strategicRes.strategic_read_model;
    valueMetrics.recordValueCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      value_read_model: {
        governance_read_model:   srm.governance_read_model,
        predictive_read_model:   srm.predictive_read_model,
        maturity_read_model:     srm.maturity_read_model,
        strategic_read_model: {
          strategic_priorities:      srm.strategic_priorities,
          improvement_opportunities: srm.improvement_opportunities,
          executive_focus:           srm.executive_focus,
          strategic_alignment:       srm.strategic_alignment
        },
        operational_value:       valueRes.operational_value,
        risk_impact:             riskRes.risk_impact,
        bottleneck_cost:         costRes.bottleneck_cost,
        portfolio_analysis:      portfolioRes.portfolio_analysis
      }
    };

  } catch (err) {
    valueMetrics.recordError(companyId, 'getValueReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getValueReadModel
};
