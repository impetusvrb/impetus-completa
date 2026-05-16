'use strict';

const crypto = require('crypto');
const db = require('../../../db');

function canonicalStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalStringify(v)).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(value[k])}`).join(',')}}`;
}

function _hash(data) {
  return crypto.createHash('sha256').update(canonicalStringify(data)).digest('hex');
}

/**
 * Cadeia de auditoria append-only (hash chain).
 */
async function appendQualityAuditEntry(companyId, entry) {
  const cid = String(companyId || '');
  if (!/^[0-9a-f-]{36}$/i.test(cid)) {
    throw new Error('appendQualityAuditEntry: company_id UUID inválido');
  }

  const prev = await db.query(
    `SELECT row_hash FROM impetus_quality_audit_chain
     WHERE company_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [cid]
  );
  const prevHash = prev.rows[0]?.row_hash || null;

  const id = entry.id || crypto.randomUUID();
  const payload = entry.payload && typeof entry.payload === 'object' ? entry.payload : {};
  const payloadHash = _hash({ payload, event_type: entry.event_type });

  const rowCore = {
    id,
    company_id: cid,
    event_type: String(entry.event_type || 'quality.audit.generic'),
    event_ref: entry.event_ref != null ? String(entry.event_ref) : null,
    correlation_id: entry.correlation_id != null ? String(entry.correlation_id) : null,
    causation_id: entry.causation_id != null ? String(entry.causation_id) : null,
    workflow_id: entry.workflow_id != null ? String(entry.workflow_id) : null,
    origin_layer: entry.origin_layer != null ? String(entry.origin_layer) : null,
    payload,
    payload_hash: payloadHash,
    prev_hash: prevHash
  };

  const rowHash = _hash(rowCore);

  await db.query(
    `INSERT INTO impetus_quality_audit_chain
      (id, company_id, event_type, event_ref, correlation_id, causation_id, workflow_id, origin_layer, payload, payload_hash, prev_hash, row_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12)`,
    [
      id,
      cid,
      rowCore.event_type,
      rowCore.event_ref,
      rowCore.correlation_id,
      rowCore.causation_id,
      rowCore.workflow_id,
      rowCore.origin_layer,
      JSON.stringify(payload),
      payloadHash,
      prevHash,
      rowHash
    ]
  );

  return { id, row_hash: rowHash, prev_hash: prevHash };
}

async function verifyCompanyChain(companyId, limit = 500) {
  const cid = String(companyId || '');
  const r = await db.query(
    `SELECT * FROM impetus_quality_audit_chain
     WHERE company_id = $1
     ORDER BY created_at ASC
     LIMIT $2`,
    [cid, limit]
  );
  let prev = null;
  for (const row of r.rows) {
    const rowCore = {
      id: row.id,
      company_id: row.company_id,
      event_type: row.event_type,
      event_ref: row.event_ref,
      correlation_id: row.correlation_id,
      causation_id: row.causation_id,
      workflow_id: row.workflow_id,
      origin_layer: row.origin_layer,
      payload: row.payload,
      payload_hash: row.payload_hash,
      prev_hash: row.prev_hash
    };
    const expected = _hash(rowCore);
    if (expected !== row.row_hash) {
      return { ok: false, reason: 'row_hash_mismatch', id: row.id };
    }
    if (row.prev_hash !== prev) {
      return { ok: false, reason: 'chain_break', id: row.id };
    }
    prev = row.row_hash;
  }
  return { ok: true, links_checked: r.rows.length };
}

module.exports = {
  appendQualityAuditEntry,
  verifyCompanyChain
};
