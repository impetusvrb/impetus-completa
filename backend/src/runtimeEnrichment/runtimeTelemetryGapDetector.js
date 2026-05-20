'use strict';

const phaseX = require('./config/phaseXFeatureFlags');
const { logPhaseX } = require('./phaseXLogger');

function detectTelemetryGaps(payload, ctx = {}) {
  const metrics = payload?.metrics || ctx.metrics || ctx.contextual_pack?.metrics || {};
  const gaps = [];

  if (metrics.plc_gap || metrics.plc_disconnected) gaps.push({ type: 'plc_gap', severity: 'high' });
  if (metrics.connector_gap || metrics.missing_connectors?.length) {
    gaps.push({ type: 'connector_gap', severity: 'high', connectors: metrics.missing_connectors });
  }
  if (metrics.data_state === 'tenant_empty' || metrics.data_state === 'tenant_inactive') {
    gaps.push({ type: 'telemetry_gap', severity: 'critical', data_state: metrics.data_state });
  }
  if (metrics.stale === true || metrics.is_stale === true || ctx.stale_enrichment) {
    gaps.push({ type: 'stale_operational_data', severity: 'medium' });
    logPhaseX('STALE_ENRICHMENT_DETECTED', { shadow_only: true });
  }
  const freshness = metrics.freshness_score ?? metrics.freshness;
  if (freshness != null && freshness < 0.5) gaps.push({ type: 'low_freshness', severity: 'high', freshness });

  if (gaps.length && phaseX.isRuntimeEnrichmentObservabilityEnabled()) {
    logPhaseX('TELEMETRY_GAP_DETECTED', { count: gaps.length, tenant_id: ctx.tenant_id, shadow_only: true });
  }

  return {
    gaps_detected: gaps.length > 0,
    gap_count: gaps.length,
    gaps,
    telemetry_integrity: gaps.length === 0 ? 0.92 : Math.max(0.4, 0.92 - gaps.length * 0.1),
    auto_fill: false
  };
}

module.exports = { detectTelemetryGaps };
