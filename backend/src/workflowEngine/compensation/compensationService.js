'use strict';

const { v4: uuidv4 } = require('uuid');
const flags = require('../config/workflowEngineFlags');
const audit = require('../audit/workflowAuditTracer');

function _log(event, data) {
  try {
    console.info('[WORKFLOW_COMPENSATION]', JSON.stringify({ event, ts: new Date().toISOString(), ...data }));
  } catch (_e) {}
}

async function runCompensation(instance, compensationKey, payload = {}) {
  const id = uuidv4();
  const companyId = instance.company_id;

  if (flags.isShadowMode()) {
    _log('shadow_compensate', { instance_id: instance.id, key: compensationKey });
    return { ok: true, shadow: true, compensation_id: id };
  }

  let result = { ok: false, reason: 'unknown_handler' };

  if (compensationKey === 'rollback_context') {
    result = {
      ok: true,
      action: 'context_rollback',
      reverted: payload.previous_context || {}
    };
  }

  if (!flags.allowsRealExecution() && flags.isAuditMode()) {
    result = { ok: true, audit_only: true, would_compensate: compensationKey };
  }

  try {
    const db = require('../../db');
    await db.query(
      `INSERT INTO industrial_workflow_compensation_log
       (id, instance_id, company_id, compensation_key, status, payload, result)
       VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6::jsonb,$7::jsonb)`,
      [
        id,
        instance.id,
        companyId,
        compensationKey,
        result.ok ? 'completed' : 'failed',
        JSON.stringify(payload),
        JSON.stringify(result)
      ]
    );
  } catch (err) {
    _log('comp_log_err', { error: err?.message });
  }

  await audit.recordAudit({
    instanceId: instance.id,
    companyId,
    eventType: 'compensation',
    fromState: instance.current_state,
    toState: instance.current_state,
    payload: { compensation_key: compensationKey, result }
  });

  _log('compensated', { instance_id: instance.id, key: compensationKey, ok: result.ok });
  return { ok: result.ok, compensation_id: id, result };
}

module.exports = { runCompensation };
