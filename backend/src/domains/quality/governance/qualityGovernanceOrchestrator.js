'use strict';

const flags = require('./qualityGovernanceRuntimeFlags');
const { buildXbarEvaluation } = require('./spc/qualityControlChartEngine');
const { detectDrift } = require('./spc/qualityTrendAnalysisEngine');
const { publishQualityIndustrialEvent } = require('../events/qualityEventPublisher');
const obs = require('../../../services/operational/enterpriseObservabilityRuntime');

async function publishIfEnabled(partial, meta) {
  return publishQualityIndustrialEvent(partial, meta);
}

/**
 * Avalia SPC e publica violação (governance layer).
 */
async function screenSubgroupsAndPublish(companyId, userId, subgroups, opts = {}) {
  const t0 = Date.now();
  if (!flags.isQualityGovernanceRuntimeEnabled() || !flags.isQualitySpcRuntimeEnabled()) {
    return { skipped: true };
  }
  const r = buildXbarEvaluation(subgroups);
  try {
    obs.recordMetric('quality_governance_spc_eval_ms', Date.now() - t0, { tenant: String(companyId || '') });
  } catch (_e) {}
  if (!r.ok) return r;
  if (r.violation_count > 0 && opts.emit !== false) {
    await publishIfEnabled(
      {
        event_name: 'quality.spc.violation_detected',
        company_id: String(companyId),
        correlation_id: opts.correlation_id,
        causation_id: userId != null ? String(userId) : undefined,
        trace_id: opts.trace_id || opts.correlation_id,
        workflow_id: opts.workflow_id,
        payload: {
          violation_count: r.violation_count,
          violations: r.violations.slice(0, 40),
          limits: r.limits
        }
      },
      { origin_layer: 'governance', intended_audience: 'supervisor', user_id: userId }
    );
  }
  return r;
}

/**
 * Deteta drift linear simples na série agregada e publica quality.process.drift_detected.
 */
async function screenDriftAndPublish(companyId, userId, series, opts = {}) {
  if (!flags.isQualityGovernanceRuntimeEnabled()) {
    return { skipped: true };
  }
  const d = detectDrift(series, { slope_threshold_per_step: opts.slope_threshold_per_step ?? 0.01 });
  if (d.error) return d;
  if (d.drift_significant && opts.emit !== false) {
    await publishIfEnabled(
      {
        event_name: 'quality.process.drift_detected',
        company_id: String(companyId),
        correlation_id: opts.correlation_id,
        causation_id: userId != null ? String(userId) : undefined,
        trace_id: opts.trace_id || opts.correlation_id,
        payload: { slope: d.slope, direction: d.direction, n: d.n }
      },
      { origin_layer: 'governance', intended_audience: 'management', user_id: userId }
    );
  }
  return d;
}

module.exports = {
  screenSubgroupsAndPublish,
  screenDriftAndPublish
};
