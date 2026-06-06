'use strict';

/**
 * AIOI-P2.1 — Governance Read Model Service (READ ONLY)
 *
 * Agregador principal da camada de governança executiva.
 */

const { isValidUUID } = require('../../utils/security');
const govMetrics = require('./aioiGovernanceMetrics');
const snapshotService = require('./aioiExecutiveSnapshotService');
const bottleneckService = require('./aioiBottleneckAnalysisService');
const cycleService = require('./aioiCycleAnalyticsService');
const slaService = require('./aioiSlaIntelligenceService');
const riskService = require('./aioiRiskAnalysisService');
const tenantHealthService = require('./aioiTenantHealthService');
const trendService = require('./aioiTrendAnalysisService');

async function getGovernanceReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  govMetrics.recordGovernanceRequested(companyId);
  const startMs = Date.now();

  try {
    const [
      snapshotRes,
      bottleneckRes,
      cycleRes,
      slaRes,
      riskRes,
      healthRes,
      trendRes
    ] = await Promise.all([
      snapshotService.getExecutiveSnapshot(companyId),
      bottleneckService.getBottleneckSummary(companyId),
      cycleService.getLifecycleAnalytics(companyId),
      slaService.getSlaAnalysis(companyId),
      riskService.getRiskAnalysis(companyId),
      tenantHealthService.getTenantHealth(companyId),
      trendService.getTrendAnalysis(companyId)
    ]);

    const failures = [snapshotRes, bottleneckRes, cycleRes, slaRes, riskRes, healthRes, trendRes]
      .filter(r => !r.ok);
    if (failures.length > 0) {
      govMetrics.recordError(companyId, 'getGovernanceReadModel', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    govMetrics.recordGovernanceCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      governance_read_model: {
        executive_snapshot:  snapshotRes.snapshot,
        bottlenecks:         bottleneckRes.bottlenecks,
        lifecycle_analytics: cycleRes.analytics,
        sla_analysis:        slaRes.sla_analysis,
        risk_analysis:       riskRes.risk_analysis,
        tenant_health:       healthRes.tenant_health,
        trend_analysis:      trendRes.trend_analysis
      }
    };

  } catch (err) {
    govMetrics.recordError(companyId, 'getGovernanceReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getGovernanceReadModel
};
