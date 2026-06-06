'use strict';

/**
 * AIOI-P2.6 — Dependency Risk Analysis Service (READ ONLY)
 *
 * Concentração de risco operacional — backlog, bottleneck, risk impact.
 */

const { isValidUUID } = require('../../utils/security');
const resMetrics = require('./aioiResilienceMetrics');
const bottleneckService = require('./aioiBottleneckAnalysisService');
const bottleneckCostService = require('./aioiBottleneckCostService');
const riskImpactService = require('./aioiRiskImpactService');

const DIMS = Object.freeze(['approval', 'execution', 'outcome', 'learning']);

function _share(value, total) {
  if (!total || total <= 0) return 0;
  return (value / total) * 100;
}

function classifyDependencyRisk(backlogShare, costShare, riskLevel) {
  const maxShare = Math.max(backlogShare, costShare);
  const rank = resMetrics.riskRank(riskLevel);

  if (maxShare >= resMetrics.CONCENTRATION_CRITICAL && rank >= 3) return 'critical';
  if (maxShare >= resMetrics.CONCENTRATION_HIGH && rank >= 3) return 'high';
  if (maxShare >= resMetrics.CONCENTRATION_HIGH || rank >= 2) return 'medium';
  return 'low';
}

function buildDependencyRiskFromSignals({ bottlenecks, bottleneckCost, riskImpact }) {
  const backlogTotal =
    (bottlenecks.approval_backlog || 0) + (bottlenecks.execution_backlog || 0) +
    (bottlenecks.outcome_backlog || 0) + (bottlenecks.learning_backlog || 0);

  const costTotal =
    bottleneckCost.approval_cost_index + bottleneckCost.execution_cost_index +
    bottleneckCost.outcome_cost_index + bottleneckCost.learning_cost_index;

  const result = {};
  for (const dim of DIMS) {
    const backlogShare = _share(bottlenecks[`${dim}_backlog`] || 0, backlogTotal);
    const costShare = _share(bottleneckCost[`${dim}_cost_index`] || 0, costTotal);
    const riskLevel = riskImpact[`${dim}_risk_impact`];
    result[`${dim}_dependency_risk`] = classifyDependencyRisk(backlogShare, costShare, riskLevel);
  }
  return result;
}

async function getDependencyRisk(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [bottleneckRes, costRes, riskRes] = await Promise.all([
      bottleneckService.getBottleneckSummary(companyId),
      bottleneckCostService.getBottleneckCost(companyId),
      riskImpactService.getRiskImpact(companyId)
    ]);

    if (!bottleneckRes.ok || !costRes.ok || !riskRes.ok) {
      const err = bottleneckRes.error || costRes.error || riskRes.error;
      resMetrics.recordError(companyId, 'getDependencyRisk', err);
      return { ok: false, error: err };
    }

    const dependency_risk = buildDependencyRiskFromSignals({
      bottlenecks:    bottleneckRes.bottlenecks,
      bottleneckCost: costRes.bottleneck_cost,
      riskImpact:     riskRes.risk_impact
    });

    resMetrics.recordDependencyRiskAnalyzed(companyId);
    return { ok: true, dependency_risk };

  } catch (err) {
    resMetrics.recordError(companyId, 'getDependencyRisk', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  classifyDependencyRisk,
  buildDependencyRiskFromSignals,
  getDependencyRisk
};
