'use strict';

/**
 * AIOI-P2.3 — Maturity Analysis Service (READ ONLY)
 *
 * Score 0-100 composto por fatores determinísticos documentados.
 */

const { isValidUUID } = require('../../utils/security');
const matMetrics = require('./aioiMaturityMetrics');
const snapshotService = require('./aioiExecutiveSnapshotService');
const slaService = require('./aioiSlaIntelligenceService');
const bottleneckService = require('./aioiBottleneckAnalysisService');
const consistencyService = require('./aioiGovernanceConsistencyService');

const IOE_TABLE = 'industrial_operational_events';
const W = matMetrics.MATURITY_WEIGHTS;

function classifyMaturityLevel(score) {
  if (score <= 20) return 'initial';
  if (score <= 40) return 'developing';
  if (score <= 60) return 'managed';
  if (score <= 80) return 'optimized';
  return 'autonomous_ready';
}

function scoreSuccessRate(rate) {
  if (rate == null || !Number.isFinite(rate)) return W.success_rate * 0.5;
  return W.success_rate * Math.max(0, Math.min(1, rate));
}

function scoreSlaCompliance(slaAnalysis) {
  if (!slaAnalysis) return W.sla_compliance * 0.5;
  const stages = Object.values(slaAnalysis);
  if (!stages.length) return W.sla_compliance * 0.5;
  const within = stages.filter(s => s.status === 'within_sla').length;
  return W.sla_compliance * (within / stages.length);
}

function scoreLearningCompletion(resolved, learningProcessed) {
  if (resolved <= 0) return W.learning_completion * 0.5;
  const ratio = Math.min(1, learningProcessed / resolved);
  return W.learning_completion * ratio;
}

function scoreGovernanceConsistency(consistencyScore) {
  if (consistencyScore == null) return W.governance_consistency * 0.5;
  return W.governance_consistency * (consistencyScore / 100);
}

function scoreBacklogHealth(totalBacklog) {
  const n = totalBacklog || 0;
  if (n <= 10) return W.backlog_health;
  if (n <= 50) return W.backlog_health * 0.5;
  return 0;
}

function computeMaturityScore(factors) {
  const raw =
    scoreSuccessRate(factors.success_rate) +
    scoreSlaCompliance(factors.sla_analysis) +
    scoreLearningCompletion(factors.resolved, factors.learning_processed) +
    scoreGovernanceConsistency(factors.consistency_score) +
    scoreBacklogHealth(factors.total_backlog);
  return matMetrics.clampScore(raw);
}

async function _fetchLearningCounts(companyId) {
  return matMetrics.withTenantReadClient(companyId, async (client) => {
    const result = await matMetrics.readQuery(client,
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) AS resolved,
         COUNT(*) FILTER (
           WHERE status IN ('resolved', 'closed')
             AND (
               decision_payload->>'aioi_learning_processed' = 'true'
               OR decision_payload->>'aioi_learning_submitted' = 'true'
             )
         ) AS learning_done
       FROM ${IOE_TABLE}
       WHERE company_id = $1::uuid`,
      [companyId]
    );
    return result.rows[0] || {};
  });
}

async function getOperationalMaturity(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [snapshotRes, slaRes, bottleneckRes, consistencyRes, learningRow] = await Promise.all([
      snapshotService.getExecutiveSnapshot(companyId),
      slaService.getSlaAnalysis(companyId),
      bottleneckService.getBottleneckSummary(companyId),
      consistencyService.getGovernanceConsistency(companyId),
      _fetchLearningCounts(companyId)
    ]);

    if (!snapshotRes.ok || !slaRes.ok || !bottleneckRes.ok || !consistencyRes.ok) {
      const err = snapshotRes.error || slaRes.error || bottleneckRes.error || consistencyRes.error;
      matMetrics.recordError(companyId, 'getOperationalMaturity', err);
      return { ok: false, error: err };
    }

    const b = bottleneckRes.bottlenecks;
    const total_backlog =
      b.approval_backlog + b.execution_backlog + b.outcome_backlog + b.learning_backlog;

    const score = computeMaturityScore({
      success_rate:      snapshotRes.snapshot.operational_success_rate,
      sla_analysis:      slaRes.sla_analysis,
      resolved:          parseInt(learningRow.resolved || '0', 10),
      learning_processed: parseInt(learningRow.learning_done || '0', 10),
      consistency_score: consistencyRes.governance_consistency.score,
      total_backlog
    });

    const maturity = { score, level: classifyMaturityLevel(score) };
    matMetrics.recordMaturityAnalyzed(companyId);
    return { ok: true, maturity };

  } catch (err) {
    matMetrics.recordError(companyId, 'getOperationalMaturity', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  MATURITY_WEIGHTS: W,
  classifyMaturityLevel,
  computeMaturityScore,
  scoreSuccessRate,
  scoreSlaCompliance,
  scoreBacklogHealth,
  getOperationalMaturity
};
