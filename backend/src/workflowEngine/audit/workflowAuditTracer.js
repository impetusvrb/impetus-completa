'use strict';

const { v4: uuidv4 } = require('uuid');
function _mode() {
  try {
    return require('../config/workflowEngineFlags').workflowEngineMode();
  } catch (_e) {
    return 'unknown';
  }
}

function _log(event, data) {
  try {
    console.info(
      '[WORKFLOW_AUDIT]',
      JSON.stringify({ event, ts: new Date().toISOString(), mode: _mode(), ...data })
    );
  } catch (_e) {}
}

async function recordAudit({
  instanceId,
  companyId,
  eventType,
  fromState,
  toState,
  actorUserId,
  payload = {}
}) {
  const id = uuidv4();
  _log('audit_record', { instance_id: instanceId, event_type: eventType, from: fromState, to: toState });

  try {
    const db = require('../../db');
    await db.query(
      `INSERT INTO industrial_workflow_audit_trail
       (id, instance_id, company_id, event_type, from_state, to_state, actor_user_id, mode, payload)
       VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7::uuid,$8,$9::jsonb)`,
      [
        id,
        instanceId,
        companyId,
        eventType,
        fromState || null,
        toState || null,
        actorUserId || null,
        _mode(),
        JSON.stringify(payload)
      ]
    );
  } catch (err) {
    _log('audit_persist_err', { error: err?.message });
  }

  return { id };
}

async function listAudit(instanceId, companyId, limit = 100) {
  try {
    const db = require('../../db');
    const r = await db.query(
      `SELECT * FROM industrial_workflow_audit_trail
       WHERE instance_id = $1::uuid AND company_id = $2::uuid
       ORDER BY created_at DESC LIMIT $3`,
      [instanceId, companyId, Math.min(200, limit)]
    );
    return r.rows || [];
  } catch (err) {
    if (err.code === '42P01') return [];
    throw err;
  }
}

module.exports = { recordAudit, listAudit };
