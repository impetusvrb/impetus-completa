'use strict';

const { v4: uuidv4 } = require('uuid');
const flags = require('./cognitiveRegistryConsolidationFlags');

function _log(event, data) {
  try {
    console.info('[COGNITIVE_REGISTRY_AUDIT]', JSON.stringify({ event, ts: new Date().toISOString(), ...data }));
  } catch (_e) {}
}

async function recordAudit({ companyId, eventType, payload = {}, actorUserId = null }) {
  const row = {
    id: uuidv4(),
    company_id: companyId || null,
    event_type: eventType,
    mode: flags.consolidationMode(),
    actor_user_id: actorUserId,
    payload
  };

  _log('audit', {
    event_type: eventType,
    company_id: companyId,
    persist: flags.shouldPersistAuditTrail()
  });

  if (!flags.shouldPersistAuditTrail()) {
    return { ...row, persisted: false, shadow_only: true };
  }

  try {
    const db = require('../../db');
    await db.query(
      `INSERT INTO cognitive_registry_consolidation_audit
       (id, company_id, event_type, mode, actor_user_id, payload)
       VALUES ($1::uuid,$2::uuid,$3,$4,$5::uuid,$6::jsonb)`,
      [
        row.id,
        row.company_id,
        row.event_type,
        row.mode,
        row.actor_user_id,
        JSON.stringify(row.payload)
      ]
    );
  } catch (err) {
    if (err.code !== '42P01') {
      _log('audit_persist_err', { error: err?.message });
    }
  }

  return { ...row, persisted: true };
}

module.exports = { recordAudit };
