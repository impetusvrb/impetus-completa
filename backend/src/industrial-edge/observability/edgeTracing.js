'use strict';

const { v4: uuidv4 } = require('uuid');
const db = require('../../db');

async function trace(companyId, event, outcome = 'ok', meta = {}) {
  const traceId = meta.trace_id || uuidv4();
  try {
    await db.query(
      `INSERT INTO edge_sync_audit (company_id, trace_id, event, outcome, metadata)
       VALUES ($1::uuid, $2, $3, $4, $5::jsonb)`,
      [companyId || null, traceId, event, outcome, JSON.stringify(meta)]
    );
  } catch (err) {
    console.warn('[EDGE_TRACE]', err?.message);
  }

  try {
    const apm = require('../../observability/apmEnterpriseBridge');
    if (apm.isApmEnterpriseEnabled?.()) {
      apm.recordGovernanceEvent('edge_runtime', { event, outcome, company_id: companyId });
    }
  } catch { /* optional */ }

  const obs = require('../../domains/environment/telemetry/environmentTelemetryObservability');
  try {
    obs.record('edge_runtime_event_total', 1, { event, outcome });
  } catch { /* optional */ }

  return traceId;
}

async function emitBootAudit() {
  const gov = require('../governance/edgeGovernanceService');
  if (!gov.getDiagnostics().enabled) return { emitted: false };
  try {
    await db.query(
      `INSERT INTO audit_logs (action, entity_type, description, user_name, created_at, company_id)
       VALUES ('edge_runtime_boot', 'industrial_edge', $1, 'system:edge_runtime', NOW(), NULL)`,
      [JSON.stringify(gov.getDiagnostics())]
    );
    return { emitted: true };
  } catch (err) {
    return { emitted: false, error: err?.message };
  }
}

module.exports = { trace, emitBootAudit };
