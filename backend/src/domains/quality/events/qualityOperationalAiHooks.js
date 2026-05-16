'use strict';

/**
 * Ganchos cognitivos operacionais — apenas publicam eventos governados (sem autoridade de workflow).
 */

const crypto = require('crypto');
const { publishQualityIndustrialEvent } = require('./qualityEventPublisher');

const HOOK_EVENT_MAP = Object.freeze({
  onInspectionFailed: 'quality.inspection.failed',
  onAnomalyDetected: 'quality.anomaly.detected',
  onCapaCreated: 'quality.capa.created',
  onSupplierDeviation: 'quality.supplier.deviated',
  onCalibrationExpired: 'quality.calibration.expired',
  onProcessDriftDetected: 'quality.process.drift_detected',
  onAuditCompleted: 'quality.audit.completed',
  onRiskEscalated: 'quality.risk.escalated'
});

async function publishOperationalHook(hookName, companyId, payload, meta = {}) {
  const event_name = HOOK_EVENT_MAP[hookName];
  if (!event_name) {
    throw new Error(`publishOperationalHook: hook desconhecido (${hookName})`);
  }
  const correlation_id = meta.correlation_id || crypto.randomUUID();
  return publishQualityIndustrialEvent(
    {
      event_name,
      company_id: companyId,
      correlation_id,
      causation_id: meta.causation_id != null ? String(meta.causation_id) : null,
      trace_id: meta.trace_id || correlation_id,
      workflow_id: meta.workflow_id != null ? String(meta.workflow_id) : null,
      idempotency_key:
        meta.idempotency_key || `quality_hook:${hookName}:${correlation_id}:${companyId}`,
      payload: { hook: hookName, ...(payload && typeof payload === 'object' ? payload : {}) },
      occurred_at: meta.occurred_at
    },
    {
      origin_layer: 'operational',
      intended_audience: meta.intended_audience || 'analyst',
      user_id: meta.user_id
    }
  );
}

/** Sugestão cognitiva não autoritativa (sempre com governação / auditoria via backbone). */
async function publishOperationalAssistHint(companyId, payload, meta = {}) {
  const correlation_id = meta.correlation_id || crypto.randomUUID();
  return publishQualityIndustrialEvent(
    {
      event_name: 'quality.cognitive.operational_hint',
      company_id: companyId,
      correlation_id,
      trace_id: meta.trace_id || correlation_id,
      workflow_id: meta.workflow_id != null ? String(meta.workflow_id) : null,
      idempotency_key: meta.idempotency_key || `quality_ai_hint:${correlation_id}:${companyId}`,
      payload: { non_authoritative: true, ...(payload && typeof payload === 'object' ? payload : {}) }
    },
    {
      origin_layer: 'operational',
      intended_audience: 'operator',
      user_id: meta.user_id
    }
  );
}

module.exports = {
  HOOK_EVENT_MAP,
  publishOperationalHook,
  publishOperationalAssistHint
};
