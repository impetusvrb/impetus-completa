'use strict';

const { v4: uuidv4 } = require('uuid');

function _log(event, data) {
  try {
    console.info('[WORKFLOW_EXECUTION_GRAPH]', JSON.stringify({ event, ts: new Date().toISOString(), ...data }));
  } catch (_e) {}
}

async function appendNode({
  instanceId,
  companyId,
  nodeId,
  nodeType,
  status,
  sequenceNo,
  inputSnapshot = {},
  outputSnapshot = {}
}) {
  const id = uuidv4();
  const row = {
    id,
    instance_id: instanceId,
    company_id: companyId,
    node_id: nodeId,
    node_type: nodeType,
    status,
    sequence_no: sequenceNo,
    input_snapshot: inputSnapshot,
    output_snapshot: outputSnapshot
  };

  try {
    const db = require('../../db');
    await db.query(
      `INSERT INTO industrial_workflow_execution_graph
       (id, instance_id, company_id, node_id, node_type, status, sequence_no,
        input_snapshot, output_snapshot)
       VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8::jsonb,$9::jsonb)`,
      [
        row.id,
        row.instance_id,
        row.company_id,
        row.node_id,
        row.node_type,
        row.status,
        row.sequence_no,
        JSON.stringify(row.input_snapshot),
        JSON.stringify(row.output_snapshot)
      ]
    );
  } catch (err) {
    _log('append_err', { instance_id: instanceId, error: err?.message });
  }

  _log('node_appended', { instance_id: instanceId, node_id: nodeId, status, sequence_no: sequenceNo });
  return row;
}

async function closeNode(instanceId, sequenceNo, outputSnapshot = {}) {
  try {
    const db = require('../../db');
    await db.query(
      `UPDATE industrial_workflow_execution_graph
       SET status = 'completed', exited_at = now(), output_snapshot = $3::jsonb
       WHERE instance_id = $1::uuid AND sequence_no = $2`,
      [instanceId, sequenceNo, JSON.stringify(outputSnapshot)]
    );
  } catch (err) {
    _log('close_err', { instance_id: instanceId, error: err?.message });
  }
}

async function listGraph(instanceId, companyId) {
  try {
    const db = require('../../db');
    const r = await db.query(
      `SELECT * FROM industrial_workflow_execution_graph
       WHERE instance_id = $1::uuid AND company_id = $2::uuid
       ORDER BY sequence_no ASC`,
      [instanceId, companyId]
    );
    return r.rows || [];
  } catch (err) {
    if (err.code === '42P01') return [];
    throw err;
  }
}

module.exports = { appendNode, closeNode, listGraph };
