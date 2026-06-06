'use strict';

/**
 * AIOI-P2.5 — Bottleneck Cost Analysis Service (READ ONLY)
 *
 * Índices relativos 0-100 — sem valores monetários reais.
 */

const { isValidUUID } = require('../../utils/security');
const valueMetrics = require('./aioiValueMetrics');
const bottleneckService = require('./aioiBottleneckAnalysisService');
const cycleService = require('./aioiCycleAnalyticsService');
const slaService = require('./aioiSlaIntelligenceService');

const BACKLOG_COST_FACTOR = 1.5;
const SLA_BREACH_COST = 25;
const CYCLE_MS_NORMALIZER = 86400000;

function computeDimensionCostIndex(backlog, cycleMs, slaBreached) {
  const backlogPart = Math.min(50, (backlog || 0) * BACKLOG_COST_FACTOR);
  const cyclePart = cycleMs != null
    ? Math.min(30, (cycleMs / CYCLE_MS_NORMALIZER) * 30)
    : 0;
  const slaPart = slaBreached ? SLA_BREACH_COST : 0;
  return valueMetrics.clampIndex(backlogPart + cyclePart + slaPart);
}

function buildBottleneckCostFromSignals({ bottlenecks, kpis, slaAnalysis }) {
  const slaBreached = (stage) => slaAnalysis?.[stage]?.status === 'breached';

  const approval_cost_index = computeDimensionCostIndex(
    bottlenecks.approval_backlog,
    kpis.triaged_to_approval_ms,
    slaBreached('triaged_to_approval') || slaBreached('open_to_triaged')
  );

  const execution_cost_index = computeDimensionCostIndex(
    bottlenecks.execution_backlog,
    kpis.approval_to_execution_ms,
    slaBreached('approval_to_execution')
  );

  const outcome_cost_index = computeDimensionCostIndex(
    bottlenecks.outcome_backlog,
    kpis.execution_to_outcome_ms,
    slaBreached('execution_to_outcome')
  );

  const learning_cost_index = computeDimensionCostIndex(
    bottlenecks.learning_backlog,
    kpis.outcome_to_learning_ms,
    slaBreached('outcome_to_learning')
  );

  const indices = [approval_cost_index, execution_cost_index, outcome_cost_index, learning_cost_index];
  const total_cost_index = valueMetrics.clampIndex(
    indices.reduce((a, b) => a + b, 0) / indices.length
  );

  return {
    approval_cost_index,
    execution_cost_index,
    outcome_cost_index,
    learning_cost_index,
    total_cost_index
  };
}

async function getBottleneckCost(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [bottleneckRes, cycleRes, slaRes] = await Promise.all([
      bottleneckService.getBottleneckSummary(companyId),
      cycleService.getCycleKpis(companyId),
      slaService.getSlaAnalysis(companyId)
    ]);

    if (!bottleneckRes.ok || !cycleRes.ok || !slaRes.ok) {
      const err = bottleneckRes.error || cycleRes.error || slaRes.error;
      valueMetrics.recordError(companyId, 'getBottleneckCost', err);
      return { ok: false, error: err };
    }

    const bottleneck_cost = buildBottleneckCostFromSignals({
      bottlenecks: bottleneckRes.bottlenecks,
      kpis:        cycleRes.kpis,
      slaAnalysis: slaRes.sla_analysis
    });

    valueMetrics.recordBottleneckCostAnalyzed(companyId);
    return { ok: true, bottleneck_cost };

  } catch (err) {
    valueMetrics.recordError(companyId, 'getBottleneckCost', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  computeDimensionCostIndex,
  buildBottleneckCostFromSignals,
  getBottleneckCost
};
