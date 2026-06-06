'use strict';

/**
 * AIOI-P2.7 — Backlog Reduction Scenario Service (READ ONLY)
 *
 * Projeção matemática de redução de backlog — sem alterar dados.
 */

const { isValidUUID } = require('../../utils/security');
const scenMetrics = require('./aioiScenarioMetrics');
const bottleneckService = require('./aioiBottleneckAnalysisService');

function sumBacklog(bottlenecks) {
  if (!bottlenecks) return 0;
  return (bottlenecks.approval_backlog || 0) +
    (bottlenecks.execution_backlog || 0) +
    (bottlenecks.outcome_backlog || 0) +
    (bottlenecks.learning_backlog || 0);
}

function buildBacklogReductionScenario(currentBacklog) {
  return {
    current_backlog:     currentBacklog,
    reduced_backlog_10:  scenMetrics.applyReduction(currentBacklog, scenMetrics.REDUCTION_FACTORS.pct10),
    reduced_backlog_25:  scenMetrics.applyReduction(currentBacklog, scenMetrics.REDUCTION_FACTORS.pct25),
    reduced_backlog_50:  scenMetrics.applyReduction(currentBacklog, scenMetrics.REDUCTION_FACTORS.pct50)
  };
}

async function getBacklogReductionScenario(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const bottleneckRes = await bottleneckService.getBottleneckSummary(companyId);
    if (!bottleneckRes.ok) {
      scenMetrics.recordError(companyId, 'getBacklogReductionScenario', bottleneckRes.error);
      return { ok: false, error: bottleneckRes.error };
    }

    const currentBacklog = sumBacklog(bottleneckRes.bottlenecks);
    const backlog_reduction_scenario = buildBacklogReductionScenario(currentBacklog);

    scenMetrics.recordBacklogScenarioAnalyzed(companyId);
    return { ok: true, backlog_reduction_scenario };

  } catch (err) {
    scenMetrics.recordError(companyId, 'getBacklogReductionScenario', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  sumBacklog,
  buildBacklogReductionScenario,
  getBacklogReductionScenario
};
