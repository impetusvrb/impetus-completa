'use strict';

const { v4: uuidv4 } = require('uuid');
const db = require('../../db');

async function trace(companyId, event, outcome = 'ok', meta = {}) {
  const traceId = meta.trace_id || uuidv4();
  try {
    await db.query(
      `INSERT INTO modbus_connection_audit (company_id, trace_id, event, outcome, host, metadata)
       VALUES ($1::uuid, $2, $3, $4, $5, $6::jsonb)`,
      [
        companyId || null,
        traceId,
        event,
        outcome,
        meta.host || null,
        JSON.stringify(meta),
      ]
    );
  } catch (err) {
    console.warn('[MODBUS_TRACE]', err?.message);
  }

  try {
    const apm = require('../../observability/apmEnterpriseBridge');
    if (apm.isApmEnterpriseEnabled?.()) {
      apm.recordGovernanceEvent('modbus_real', { event, outcome, company_id: companyId });
    }
  } catch { /* optional */ }

  const obs = require('../../domains/environment/telemetry/environmentTelemetryObservability');
  try {
    obs.record('modbus_real_event_total', 1, { event, outcome });
    if (meta.latency_ms != null) {
      obs.record('modbus_real_poll_latency_ms', meta.latency_ms, { registers: meta.register_count });
    }
  } catch { /* optional */ }

  return traceId;
}

async function emitBootAudit() {
  const gov = require('../governance/modbusGovernanceService');
  if (!gov.getDiagnostics().enabled) return { emitted: false };
  try {
    await db.query(
      `INSERT INTO audit_logs (action, entity_type, description, user_name, created_at, company_id)
       VALUES ('modbus_real_boot', 'industrial_modbus', $1, 'system:modbus_real', NOW(), NULL)`,
      [JSON.stringify(gov.getDiagnostics())]
    );
    return { emitted: true };
  } catch (err) {
    return { emitted: false, error: err?.message };
  }
}

module.exports = { trace, emitBootAudit };
