'use strict';

/**
 * AIOI-P2.1 — Risk Analysis Service (READ ONLY)
 *
 * Risco determinístico baseado em backlogs — sem IA, sem ML.
 */

const { isValidUUID } = require('../../utils/security');
const govMetrics = require('./aioiGovernanceMetrics');
const bottleneckService = require('./aioiBottleneckAnalysisService');

function classifyBacklogRisk(count) {
  const n = parseInt(String(count), 10) || 0;
  if (n <= 10) return 'low';
  if (n <= 50) return 'medium';
  return 'high';
}

async function getRiskAnalysis(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const bottleneckRes = await bottleneckService.getBottleneckSummary(companyId);
    if (!bottleneckRes.ok) {
      govMetrics.recordError(companyId, 'getRiskAnalysis', bottleneckRes.error);
      return { ok: false, error: bottleneckRes.error };
    }

    const b = bottleneckRes.bottlenecks;
    const risk_analysis = {
      approval_risk:  classifyBacklogRisk(b.approval_backlog),
      execution_risk: classifyBacklogRisk(b.execution_backlog),
      outcome_risk:   classifyBacklogRisk(b.outcome_backlog),
      learning_risk:  classifyBacklogRisk(b.learning_backlog)
    };

    govMetrics.recordRiskAnalyzed(companyId);
    return { ok: true, risk_analysis };

  } catch (err) {
    govMetrics.recordError(companyId, 'getRiskAnalysis', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  classifyBacklogRisk,
  getRiskAnalysis
};
