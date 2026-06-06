'use strict';

/**
 * AIOI-P2.1 — SLA Intelligence Service (READ ONLY)
 *
 * Compara tempos médios do ciclo com thresholds determinísticos.
 */

const { isValidUUID } = require('../../utils/security');
const govMetrics = require('./aioiGovernanceMetrics');
const cycleService = require('./aioiCycleAnalyticsService');

const SLA_THRESHOLDS = Object.freeze({
  open_to_triaged:        3600000,
  triaged_to_approval:    7200000,
  approval_to_execution:  3600000,
  execution_to_outcome:   14400000,
  outcome_to_learning:    7200000,
  end_to_end:             86400000
});

const SLA_KEY_MAP = Object.freeze({
  open_to_triaged_ms:       'open_to_triaged',
  triaged_to_approval_ms:   'triaged_to_approval',
  approval_to_execution_ms: 'approval_to_execution',
  execution_to_outcome_ms:  'execution_to_outcome',
  outcome_to_learning_ms:   'outcome_to_learning',
  end_to_end_cycle_ms:      'end_to_end'
});

function classifySlaStatus(avgMs, thresholdMs) {
  if (avgMs == null || thresholdMs == null) {
    return { avg_time_ms: null, threshold_ms: thresholdMs, status: 'within_sla' };
  }
  const avg = Number(avgMs);
  const threshold = Number(thresholdMs);
  let status = 'within_sla';
  if (avg >= threshold) {
    status = 'breached';
  } else if (avg > threshold * 0.8) {
    status = 'at_risk';
  }
  return {
    avg_time_ms:   Math.round(avg),
    threshold_ms:  threshold,
    status
  };
}

function buildSlaFromKpis(kpis) {
  const result = {};
  for (const [kpiKey, slaKey] of Object.entries(SLA_KEY_MAP)) {
    result[slaKey] = classifySlaStatus(kpis[kpiKey], SLA_THRESHOLDS[slaKey]);
  }
  return result;
}

function countSlaBreaches(slaAnalysis) {
  return Object.values(slaAnalysis).filter(s => s.status === 'breached').length;
}

async function getSlaAnalysis(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const cycleRes = await cycleService.getCycleKpis(companyId);
    if (!cycleRes.ok) {
      govMetrics.recordError(companyId, 'getSlaAnalysis', cycleRes.error);
      return { ok: false, error: cycleRes.error };
    }

    const sla_analysis = buildSlaFromKpis(cycleRes.kpis);
    govMetrics.recordSlaAnalyzed(companyId);

    return { ok: true, sla_analysis };

  } catch (err) {
    govMetrics.recordError(companyId, 'getSlaAnalysis', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  SLA_THRESHOLDS,
  classifySlaStatus,
  buildSlaFromKpis,
  countSlaBreaches,
  getSlaAnalysis
};
