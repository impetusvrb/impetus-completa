'use strict';

/**
 * AIOI-P2.9 — Executive Priority Matrix Service (READ ONLY)
 *
 * Consolida prioridades estratégicas, risco, custo e valor — composição P2.4/P2.5.
 */

const { isValidUUID } = require('../../utils/security');
const cmdMetrics = require('./aioiExecutiveCommandMetrics');
const priorityService = require('./aioiPriorityAnalysisService');
const portfolioService = require('./aioiPortfolioAnalysisService');

function buildExecutivePriorityMatrix({ strategicPriorities, portfolioAnalysis }) {
  const topPriority = strategicPriorities?.priorities?.[0]?.domain ?? 'governance';
  return {
    highest_priority_domain: topPriority,
    highest_risk_domain:     portfolioAnalysis.highest_risk_area,
    highest_cost_domain:     portfolioAnalysis.highest_cost_area,
    highest_value_domain:    portfolioAnalysis.highest_value_area
  };
}

async function getExecutivePriorityMatrix(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [priorityRes, portfolioRes] = await Promise.all([
      priorityService.getStrategicPriorities(companyId),
      portfolioService.getPortfolioAnalysis(companyId)
    ]);

    if (!priorityRes.ok || !portfolioRes.ok) {
      const err = priorityRes.error || portfolioRes.error;
      cmdMetrics.recordError(companyId, 'getExecutivePriorityMatrix', err);
      return { ok: false, error: err };
    }

    const executive_priority_matrix = buildExecutivePriorityMatrix({
      strategicPriorities: priorityRes.strategic_priorities,
      portfolioAnalysis:   portfolioRes.portfolio_analysis
    });

    cmdMetrics.recordPriorityMatrixAnalyzed(companyId);
    return { ok: true, executive_priority_matrix };

  } catch (err) {
    cmdMetrics.recordError(companyId, 'getExecutivePriorityMatrix', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  buildExecutivePriorityMatrix,
  getExecutivePriorityMatrix
};
