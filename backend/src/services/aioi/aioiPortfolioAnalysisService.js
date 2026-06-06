'use strict';

/**
 * AIOI-P2.5 — Portfolio Analysis Service (READ ONLY)
 *
 * Análise de portfólio operacional — índices relativos, sem monetização real.
 */

const { isValidUUID } = require('../../utils/security');
const valueMetrics = require('./aioiValueMetrics');
const operationalValueService = require('./aioiOperationalValueService');
const riskImpactService = require('./aioiRiskImpactService');
const bottleneckCostService = require('./aioiBottleneckCostService');

const PORTFOLIO_AREAS = Object.freeze(['approval', 'execution', 'outcome', 'learning']);

function _argmaxArea(values) {
  let best = PORTFOLIO_AREAS[0];
  let max = -1;
  for (const area of PORTFOLIO_AREAS) {
    const v = values[area] ?? 0;
    if (v > max) { max = v; best = area; }
  }
  return best;
}

function _argminArea(values) {
  let best = PORTFOLIO_AREAS[0];
  let min = Infinity;
  for (const area of PORTFOLIO_AREAS) {
    const v = values[area] ?? 0;
    if (v < min) { min = v; best = area; }
  }
  return best;
}

function computePortfolioBalanceScore(costIndices) {
  const vals = PORTFOLIO_AREAS.map(a => costIndices[`${a}_cost_index`] ?? 0);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const spread = max - min;
  return valueMetrics.clampIndex(100 - spread);
}

function buildPortfolioAnalysis({ operationalValue, riskImpact, bottleneckCost }) {
  const costByArea = {
    approval:  bottleneckCost.approval_cost_index,
    execution: bottleneckCost.execution_cost_index,
    outcome:   bottleneckCost.outcome_cost_index,
    learning:  bottleneckCost.learning_cost_index
  };

  const riskByArea = {
    approval:  valueMetrics.riskRank(riskImpact.approval_risk_impact),
    execution: valueMetrics.riskRank(riskImpact.execution_risk_impact),
    outcome:   valueMetrics.riskRank(riskImpact.outcome_risk_impact),
    learning:  valueMetrics.riskRank(riskImpact.learning_risk_impact)
  };

  const valueByArea = {};
  for (const area of PORTFOLIO_AREAS) {
    valueByArea[area] = valueMetrics.clampIndex(
      100 - (costByArea[area] * 0.6) - (riskByArea[area] * 10)
    );
  }

  return {
    highest_value_area:      _argmaxArea(valueByArea),
    highest_cost_area:       _argmaxArea(costByArea),
    highest_risk_area:       _argmaxArea(riskByArea),
    portfolio_balance_score: computePortfolioBalanceScore(bottleneckCost),
    operational_value_score: operationalValue.operational_value_score
  };
}

async function getPortfolioAnalysis(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [valueRes, riskRes, costRes] = await Promise.all([
      operationalValueService.getOperationalValue(companyId),
      riskImpactService.getRiskImpact(companyId),
      bottleneckCostService.getBottleneckCost(companyId)
    ]);

    if (!valueRes.ok || !riskRes.ok || !costRes.ok) {
      const err = valueRes.error || riskRes.error || costRes.error;
      valueMetrics.recordError(companyId, 'getPortfolioAnalysis', err);
      return { ok: false, error: err };
    }

    const portfolio_analysis = buildPortfolioAnalysis({
      operationalValue: valueRes.operational_value,
      riskImpact:         riskRes.risk_impact,
      bottleneckCost:     costRes.bottleneck_cost
    });

    valueMetrics.recordPortfolioAnalyzed(companyId);
    return { ok: true, portfolio_analysis };

  } catch (err) {
    valueMetrics.recordError(companyId, 'getPortfolioAnalysis', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  computePortfolioBalanceScore,
  buildPortfolioAnalysis,
  getPortfolioAnalysis
};
