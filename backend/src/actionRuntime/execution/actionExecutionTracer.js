'use strict';

const { v4: uuidv4 } = require('uuid');
const flags = require('../config/actionRuntimeFlags');

function _log(event, data) {
  try {
    console.info(
      '[ACTION_RUNTIME_TRACE]',
      JSON.stringify({ event, ts: new Date().toISOString(), mode: flags.actionRuntimeMode(), ...data })
    );
  } catch (_e) {}
}

async function createTrace(row) {
  const id = row.id || uuidv4();
  const traceId = row.trace_id || `act-${uuidv4()}`;
  const record = {
    id,
    company_id: row.company_id,
    approval_id: row.approval_id || null,
    trace_id: traceId,
    tool_name: row.tool_name,
    mode: row.mode || flags.actionRuntimeMode(),
    status: row.status || 'proposed',
    requested_by_user_id: row.requested_by_user_id || null,
    executed_by_user_id: row.executed_by_user_id || null,
    tool_args: row.tool_args || {},
    execution_result: row.execution_result || {},
    explainability: row.explainability || {},
    rollback_available: !!row.rollback_available,
    metadata: row.metadata || {}
  };

  _log('trace_created', { trace_id: traceId, tool: record.tool_name, status: record.status });

  try {
    const db = require('../../db');
    await db.query(
      `INSERT INTO ai_action_execution_traces
       (id, company_id, approval_id, trace_id, tool_name, mode, status,
        requested_by_user_id, executed_by_user_id, tool_args, execution_result,
        explainability, rollback_available, metadata)
       VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8::uuid,$9::uuid,$10::jsonb,$11::jsonb,$12::jsonb,$13,$14::jsonb)`,
      [
        record.id,
        record.company_id,
        record.approval_id,
        record.trace_id,
        record.tool_name,
        record.mode,
        record.status,
        record.requested_by_user_id,
        record.executed_by_user_id,
        JSON.stringify(record.tool_args),
        JSON.stringify(record.execution_result),
        JSON.stringify(record.explainability),
        record.rollback_available,
        JSON.stringify(record.metadata)
      ]
    );
  } catch (err) {
    _log('trace_persist_err', { trace_id: traceId, error: err?.message });
  }

  return record;
}

async function updateTrace(traceId, companyId, patch) {
  _log('trace_updated', { trace_id: traceId, status: patch.status });
  try {
    const db = require('../../db');
    const sets = ['updated_at = now()'];
    const params = [traceId, companyId];
    let i = 3;
    if (patch.status) {
      sets.push(`status = $${i++}`);
      params.push(patch.status);
    }
    if (patch.execution_result != null) {
      sets.push(`execution_result = $${i++}::jsonb`);
      params.push(JSON.stringify(patch.execution_result));
    }
    if (patch.executed_by_user_id) {
      sets.push(`executed_by_user_id = $${i++}::uuid`);
      params.push(patch.executed_by_user_id);
    }
    if (patch.duration_ms != null) {
      sets.push(`duration_ms = $${i++}`);
      params.push(patch.duration_ms);
    }
    if (patch.error_message) {
      sets.push(`error_message = $${i++}`);
      params.push(String(patch.error_message).slice(0, 2000));
    }
    if (patch.rolled_back_at) {
      sets.push(`rolled_back_at = now()`);
      sets.push(`rollback_result = $${i++}::jsonb`);
      params.push(JSON.stringify(patch.rollback_result || {}));
    }
    await db.query(
      `UPDATE ai_action_execution_traces SET ${sets.join(', ')}
       WHERE trace_id = $1 AND company_id = $2::uuid`,
      params
    );
  } catch (err) {
    _log('trace_update_err', { trace_id: traceId, error: err?.message });
  }
}

async function listTraces(companyId, opts = {}) {
  const limit = Math.min(200, Math.max(1, Number(opts.limit) || 50));
  try {
    const db = require('../../db');
    let sql = `SELECT * FROM ai_action_execution_traces WHERE company_id = $1::uuid`;
    const params = [companyId];
    if (opts.status) {
      sql += ` AND status = $2`;
      params.push(opts.status);
    }
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    const r = await db.query(sql, params);
    return r.rows || [];
  } catch (err) {
    if (err.code === '42P01') return [];
    throw err;
  }
}

module.exports = {
  createTrace,
  updateTrace,
  listTraces
};
