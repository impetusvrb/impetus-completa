'use strict';

/**
 * AIOI-P2.4 — Strategic Priority Analysis Service (READ ONLY)
 *
 * Ranking determinístico por domínio — sem IA, sem execução.
 */

const { isValidUUID } = require('../../utils/security');
const stratMetrics = require('./aioiStrategicMetrics');
const slaService = require('./aioiSlaIntelligenceService');
const bottleneckService = require('./aioiBottleneckAnalysisService');
const maturityService = require('./aioiMaturityAnalysisService');
const stabilityService = require('./aioiOperationalStabilityService');
const consistencyService = require('./aioiGovernanceConsistencyService');

function scoreSlaDomain(slaAnalysis) {
  if (!slaAnalysis) return 0;
  const stages = Object.values(slaAnalysis);
  const breached = stages.filter(s => s.status === 'breached').length;
  const atRisk = stages.filter(s => s.status === 'at_risk').length;
  return stratMetrics.clampScore(breached * 30 + atRisk * 15);
}

function scoreBacklogDomain(bottlenecks) {
  if (!bottlenecks) return 0;
  const total =
    (bottlenecks.approval_backlog || 0) +
    (bottlenecks.execution_backlog || 0) +
    (bottlenecks.outcome_backlog || 0) +
    (bottlenecks.learning_backlog || 0);
  if (total > 50) return 90;
  if (total > 10) return 60;
  if (total > 0) return 30;
  return 10;
}

function scoreMaturityGap(maturity) {
  if (!maturity || maturity.score == null) return 50;
  return stratMetrics.clampScore(100 - maturity.score);
}

function scoreStabilityGap(stability) {
  if (!stability || stability.stability_score == null) return 50;
  return stratMetrics.clampScore(100 - stability.stability_score);
}

function scoreGovernanceGap(consistency) {
  if (!consistency || consistency.score == null) return 50;
  return stratMetrics.clampScore(100 - consistency.score);
}

function buildPrioritiesFromSignals({ slaAnalysis, bottlenecks, maturity, stability, consistency }) {
  const domains = [
    { domain: 'sla',        priority_score: scoreSlaDomain(slaAnalysis) },
    { domain: 'backlog',    priority_score: scoreBacklogDomain(bottlenecks) },
    { domain: 'maturity',   priority_score: scoreMaturityGap(maturity) },
    { domain: 'stability',  priority_score: scoreStabilityGap(stability) },
    { domain: 'governance', priority_score: scoreGovernanceGap(consistency) }
  ];

  return domains
    .map(d => ({
      domain:         d.domain,
      priority_score: d.priority_score,
      priority_level: stratMetrics.classifyPriorityLevel(d.priority_score)
    }))
    .sort((a, b) => b.priority_score - a.priority_score);
}

async function getStrategicPriorities(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [slaRes, bottleneckRes, maturityRes, stabilityRes, consistencyRes] = await Promise.all([
      slaService.getSlaAnalysis(companyId),
      bottleneckService.getBottleneckSummary(companyId),
      maturityService.getOperationalMaturity(companyId),
      stabilityService.getOperationalStability(companyId),
      consistencyService.getGovernanceConsistency(companyId)
    ]);

    const failures = [slaRes, bottleneckRes, maturityRes, stabilityRes, consistencyRes].filter(r => !r.ok);
    if (failures.length) {
      stratMetrics.recordError(companyId, 'getStrategicPriorities', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    const priorities = buildPrioritiesFromSignals({
      slaAnalysis:  slaRes.sla_analysis,
      bottlenecks:  bottleneckRes.bottlenecks,
      maturity:     maturityRes.maturity,
      stability:    stabilityRes.stability,
      consistency:  consistencyRes.governance_consistency
    });

    stratMetrics.recordPriorityAnalyzed(companyId);
    return { ok: true, strategic_priorities: { priorities } };

  } catch (err) {
    stratMetrics.recordError(companyId, 'getStrategicPriorities', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  scoreSlaDomain,
  scoreBacklogDomain,
  scoreMaturityGap,
  scoreStabilityGap,
  scoreGovernanceGap,
  buildPrioritiesFromSignals,
  getStrategicPriorities
};
