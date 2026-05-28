'use strict';

const { v4: uuidv4 } = require('uuid');
const db = require('../../db');
const gov = require('../governance/federationGovernanceService');

async function startTrace(ctx = {}) {
  const traceId = ctx.trace_id || uuidv4();
  return { trace_id: traceId, company_id: ctx.company_id || null, provider_id: ctx.provider_id || null };
}

async function recordEvent(trace, event, outcome = 'ok', metadata = {}) {
  if (!trace?.trace_id) return;
  try {
    await db.query(
      `INSERT INTO federation_login_traces
       (trace_id, company_id, provider_id, protocol, event, outcome, user_id, metadata, ip_address, user_agent)
       VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7::uuid, $8::jsonb, $9::inet, $10)`,
      [
        trace.trace_id,
        trace.company_id || null,
        trace.provider_id || null,
        metadata.protocol || trace.protocol || null,
        event,
        outcome,
        metadata.user_id || null,
        JSON.stringify(metadata),
        metadata.ip || null,
        metadata.user_agent || null,
      ]
    );
  } catch (err) {
    console.warn('[FEDERATION_TRACE]', err?.message);
  }

  try {
    const apm = require('../../observability/apmEnterpriseBridge');
    if (apm.isApmEnterpriseEnabled?.()) {
      apm.recordGovernanceEvent('federation_login', {
        event,
        outcome,
        company_id: trace.company_id,
        protocol: metadata.protocol,
      });
    }
  } catch { /* optional */ }
}

async function emitAudit(action, description = {}) {
  try {
    await db.query(
      `INSERT INTO audit_logs (action, entity_type, description, user_name, created_at, company_id)
       VALUES ($1, 'enterprise_federation', $2, 'system:federation', NOW(), $3::uuid)`,
      [action, JSON.stringify(description), description.company_id || null]
    );
  } catch (err) {
    console.warn('[FEDERATION_AUDIT]', err?.message);
  }
}

module.exports = {
  startTrace,
  recordEvent,
  emitAudit,
};
