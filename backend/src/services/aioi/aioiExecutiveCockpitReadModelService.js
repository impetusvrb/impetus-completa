'use strict';

/**
 * AIOI-P4.4 — Executive Cockpit Read Model Service (READ ONLY)
 *
 * Agregador P4.3 + capacidades P4.4 — getVisualizationReadModel uma única vez.
 */

const { isValidUUID } = require('../../utils/security');
const cockpitMetrics = require('./aioiCockpitMetrics');
const visualizationReadModel = require('./aioiVisualizationReadModelService');
const summaryService = require('./aioiExecutiveSummaryService');
const overviewService = require('./aioiStrategicOverviewService');
const enterpriseCockpitService = require('./aioiEnterpriseCockpitReadinessService');

async function getExecutiveCockpitReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  cockpitMetrics.recordCockpitRequested(companyId);
  const startMs = Date.now();

  try {
    const vrmRes = await visualizationReadModel.getVisualizationReadModel(companyId);
    if (!vrmRes.ok) {
      cockpitMetrics.recordError(companyId, 'getExecutiveCockpitReadModel', vrmRes.error);
      return { ok: false, error: vrmRes.error };
    }

    const vrm = vrmRes.visualization_read_model;
    const extracted = cockpitMetrics._extractCockpitSignals(vrm);

    const executive_summary = summaryService.buildExecutiveSummary(vrm);
    const strategic_overview = overviewService.buildStrategicOverview(vrm);

    const enterprise_cockpit_readiness = enterpriseCockpitService.buildEnterpriseCockpitReadiness({
      summaryScore:               executive_summary.summary_score,
      overviewScore:              strategic_overview.overview_score,
      visualizationCoverageScore: extracted.visualizationCoverageScore,
      visualizationReadinessScore: extracted.visualizationReadinessScore
    });

    const [
      summaryRes,
      overviewRes,
      cockpitRes
    ] = await Promise.all([
      Promise.resolve({ ok: true, executive_summary }),
      Promise.resolve({ ok: true, strategic_overview }),
      Promise.resolve({ ok: true, enterprise_cockpit_readiness })
    ]);

    cockpitMetrics.recordExecutiveSummaryAnalyzed(companyId);
    cockpitMetrics.recordStrategicOverviewAnalyzed(companyId);
    cockpitMetrics.recordEnterpriseCockpitReadinessAnalyzed(companyId);
    cockpitMetrics.recordCockpitCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      executive_cockpit_read_model: {
        visualization_read_model:           vrm,
        executive_summary:                    summaryRes.executive_summary,
        strategic_overview:                   overviewRes.strategic_overview,
        enterprise_cockpit_readiness:           cockpitRes.enterprise_cockpit_readiness
      }
    };

  } catch (err) {
    cockpitMetrics.recordError(companyId, 'getExecutiveCockpitReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getExecutiveCockpitReadModel
};
