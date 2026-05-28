'use strict';

const { v4: uuidv4 } = require('uuid');
const db = require('../../db');

async function startTrace(ctx = {}) {
  return {
    trace_id: ctx.trace_id || uuidv4(),
    user_id: ctx.user_id || null,
    company_id: ctx.company_id || null,
  };
}

async function recordEvent(trace, event, outcome = 'ok', meta = {}) {
  if (!trace?.trace_id) return;
  try {
    await db.query(
      `INSERT INTO mfa_audit_events
       (trace_id, user_id, company_id, event, outcome, method, metadata, ip_address)
       VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7::jsonb, $8::inet)`,
      [
        trace.trace_id,
        trace.user_id || meta.user_id || null,
        trace.company_id || meta.company_id || null,
        event,
        outcome,
        meta.method || null,
        JSON.stringify(meta),
        meta.ip || null,
      ]
    );
  } catch (err) {
    console.warn('[MFA_AUDIT]', err?.message);
  }

  try {
    const apm = require('../../observability/apmEnterpriseBridge');
    if (apm.isApmEnterpriseEnabled?.()) {
      apm.recordGovernanceEvent('mfa_event', { event, outcome, company_id: trace.company_id });
    }
  } catch { /* optional */ }
}

async function emitBootAudit() {
  const gov = require('../governance/mfaGovernanceService');
  if (!gov.getDiagnostics().enabled) return { emitted: false };
  try {
    await db.query(
      `INSERT INTO audit_logs (action, entity_type, description, user_name, created_at, company_id)
       VALUES ('mfa_boot', 'enterprise_mfa', $1, 'system:mfa', NOW(), NULL)`,
      [JSON.stringify(gov.getDiagnostics())]
    );
    return { emitted: true };
  } catch (err) {
    return { emitted: false, error: err?.message };
  }
}

module.exports = { startTrace, recordEvent, emitBootAudit };
