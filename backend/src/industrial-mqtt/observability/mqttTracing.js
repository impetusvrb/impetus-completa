'use strict';

const { v4: uuidv4 } = require('uuid');
const db = require('../../db');

async function trace(companyId, event, outcome = 'ok', meta = {}) {
  const traceId = meta.trace_id || uuidv4();
  try {
    await db.query(
      `INSERT INTO mqtt_connection_audit (company_id, trace_id, event, outcome, broker_url, metadata)
       VALUES ($1::uuid, $2, $3, $4, $5, $6::jsonb)`,
      [
        companyId || null,
        traceId,
        event,
        outcome,
        meta.broker_url || null,
        JSON.stringify(meta),
      ]
    );
  } catch (err) {
    console.warn('[MQTT_TRACE]', err?.message);
  }

  try {
    const apm = require('../../observability/apmEnterpriseBridge');
    if (apm.isApmEnterpriseEnabled?.()) {
      apm.recordGovernanceEvent('mqtt_real', { event, outcome, company_id: companyId });
    }
  } catch { /* optional */ }

  const obs = require('../../domains/environment/telemetry/environmentTelemetryObservability');
  try {
    obs.record('mqtt_real_event_total', 1, { event, outcome });
    if (meta.latency_ms != null) {
      obs.record('mqtt_real_message_latency_ms', meta.latency_ms, { topic: meta.topic });
    }
  } catch { /* optional */ }

  return traceId;
}

async function emitBootAudit() {
  const gov = require('../governance/mqttGovernanceService');
  if (!gov.getDiagnostics().enabled) return { emitted: false };
  try {
    await db.query(
      `INSERT INTO audit_logs (action, entity_type, description, user_name, created_at, company_id)
       VALUES ('mqtt_real_boot', 'industrial_mqtt', $1, 'system:mqtt_real', NOW(), NULL)`,
      [JSON.stringify(gov.getDiagnostics())]
    );
    return { emitted: true };
  } catch (err) {
    return { emitted: false, error: err?.message };
  }
}

module.exports = { trace, emitBootAudit };
