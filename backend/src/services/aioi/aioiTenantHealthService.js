'use strict';

/**
 * AIOI-P2.1 — Tenant Health Service (READ ONLY)
 *
 * Score 0-100 determinístico — sem IA, sem pesos aprendidos.
 *
 * Regras documentadas:
 *   base = 100
 *   -15 por cada SLA breached (máx -60)
 *   -10 se total_backlogs > 50
 *   -5  se total_backlogs > 10
 *   -30 * (1 - operational_success_rate) se rate conhecido
 *   -20 se end_to_end > 80% do threshold SLA end_to_end
 *   clamp 0..100
 *   healthy: score >= 80 | attention: >= 50 | critical: < 50
 */

const { isValidUUID } = require('../../utils/security');
const govMetrics = require('./aioiGovernanceMetrics');
const snapshotService = require('./aioiExecutiveSnapshotService');
const bottleneckService = require('./aioiBottleneckAnalysisService');
const slaService = require('./aioiSlaIntelligenceService');
const cycleService = require('./aioiCycleAnalyticsService');

function computeHealthScore({
  operational_success_rate,
  end_to_end_cycle_ms,
  total_backlogs,
  sla_breaches
}) {
  let score = 100;

  score -= Math.min(60, (sla_breaches || 0) * 15);

  const backlogs = total_backlogs || 0;
  if (backlogs > 50) score -= 10;
  else if (backlogs > 10) score -= 5;

  if (operational_success_rate != null && Number.isFinite(operational_success_rate)) {
    score -= Math.round((1 - operational_success_rate) * 30);
  }

  const e2eThreshold = slaService.SLA_THRESHOLDS.end_to_end;
  if (end_to_end_cycle_ms != null && end_to_end_cycle_ms > e2eThreshold * 0.8) {
    score -= 20;
  }

  return Math.max(0, Math.min(100, score));
}

function classifyHealthStatus(score) {
  if (score >= 80) return 'healthy';
  if (score >= 50) return 'attention';
  return 'critical';
}

async function getTenantHealth(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [snapshotRes, bottleneckRes, slaRes] = await Promise.all([
      snapshotService.getExecutiveSnapshot(companyId),
      bottleneckService.getBottleneckSummary(companyId),
      slaService.getSlaAnalysis(companyId)
    ]);

    if (!snapshotRes.ok || !bottleneckRes.ok || !slaRes.ok) {
      const err = snapshotRes.error || bottleneckRes.error || slaRes.error;
      govMetrics.recordError(companyId, 'getTenantHealth', err);
      return { ok: false, error: err };
    }

    const b = bottleneckRes.bottlenecks;
    const total_backlogs =
      b.approval_backlog + b.execution_backlog + b.outcome_backlog + b.learning_backlog;
    const sla_breaches = slaService.countSlaBreaches(slaRes.sla_analysis);

    const cycleRes = await cycleService.getCycleKpis(companyId);
    const end_to_end_cycle_ms = cycleRes.ok ? cycleRes.kpis.end_to_end_cycle_ms : null;

    const score = computeHealthScore({
      operational_success_rate: snapshotRes.snapshot.operational_success_rate,
      end_to_end_cycle_ms,
      total_backlogs,
      sla_breaches
    });

    const tenant_health = {
      score,
      status: classifyHealthStatus(score),
      operational_success_rate: snapshotRes.snapshot.operational_success_rate,
      end_to_end_cycle_ms,
      total_backlogs,
      sla_breaches
    };

    govMetrics.recordTenantHealthCalculated(companyId);
    return { ok: true, tenant_health };

  } catch (err) {
    govMetrics.recordError(companyId, 'getTenantHealth', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  computeHealthScore,
  classifyHealthStatus,
  getTenantHealth
};
