'use strict';

/**
 * AIOI-P2.0 — Executive Read Model Service (READ ONLY)
 *
 * Agregador principal da camada de inteligência executiva.
 * Compõe snapshot, gargalos, analytics e visão operacional.
 */

const { isValidUUID } = require('../../utils/security');
const execMetrics = require('./aioiExecutiveMetrics');
const snapshotService = require('./aioiExecutiveSnapshotService');
const bottleneckService = require('./aioiBottleneckAnalysisService');
const cycleService = require('./aioiCycleAnalyticsService');
const operationalService = require('./aioiOperationalViewService');

async function getExecutiveReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  const startMs = Date.now();

  try {
    const [snapshotRes, bottleneckRes, cycleRes, viewRes] = await Promise.all([
      snapshotService.getExecutiveSnapshot(companyId),
      bottleneckService.getBottleneckSummary(companyId),
      cycleService.getLifecycleAnalytics(companyId),
      operationalService.getOperationalView(companyId)
    ]);

    if (!snapshotRes.ok) {
      execMetrics.recordError(companyId, 'getExecutiveReadModel', snapshotRes.error);
      return { ok: false, error: snapshotRes.error };
    }
    if (!bottleneckRes.ok) {
      execMetrics.recordError(companyId, 'getExecutiveReadModel', bottleneckRes.error);
      return { ok: false, error: bottleneckRes.error };
    }
    if (!cycleRes.ok) {
      execMetrics.recordError(companyId, 'getExecutiveReadModel', cycleRes.error);
      return { ok: false, error: cycleRes.error };
    }
    if (!viewRes.ok) {
      execMetrics.recordError(companyId, 'getExecutiveReadModel', viewRes.error);
      return { ok: false, error: viewRes.error };
    }

    execMetrics.recordSnapshotRequested(companyId, Date.now() - startMs);

    return {
      ok: true,
      read_model: {
        executive_snapshot: snapshotRes.snapshot,
        bottlenecks:        bottleneckRes.bottlenecks,
        cycle_analytics:    cycleRes.analytics,
        operational_view:   viewRes.operational_view
      }
    };

  } catch (err) {
    execMetrics.recordError(companyId, 'getExecutiveReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getExecutiveReadModel
};
