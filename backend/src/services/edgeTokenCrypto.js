'use strict';

const crypto = require('crypto');

/**
 * Comparação timing-safe de digests hex SHA-256 (64 chars).
 * Falha segura para comprimentos diferentes ou hex inválido.
 */
function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  if (a.length !== 64) return false;
  try {
    const ba = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch (_e) {
    return false;
  }
}

function hashEdgeToken(token) {
  return crypto.createHash('sha256').update(String(token).trim()).digest('hex');
}

/**
 * Valida credenciais edge sem persistir dados.
 * @returns {Promise<{ ok: boolean, edge_id?: string, company_id?: number, agentId?: number, error?: string }>}
 */
async function validateEdgeCredentials(payload) {
  const db = require('../db');
  const { edge_id, company_id, token } = payload || {};

  if (!edge_id || !company_id) {
    return { ok: false, error: 'edge_id e company_id obrigatórios' };
  }
  if (!token || typeof token !== 'string') {
    return { ok: false, error: 'token obrigatório no corpo' };
  }

  let r;
  try {
    r = await db.query(
      'SELECT id, token_hash FROM edge_agents WHERE company_id = $1 AND edge_id = $2 AND enabled = true',
      [company_id, edge_id]
    );
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('edge_agents') && msg.includes('does not exist')) {
      return { ok: false, error: 'Tabela edge_agents inexistente' };
    }
    throw e;
  }

  const agentRow = r.rows?.[0];
  if (!agentRow?.token_hash) {
    return { ok: false, error: 'Edge não registado ou sem token' };
  }

  const inputHash = hashEdgeToken(token);
  if (!timingSafeEqualHex(inputHash, agentRow.token_hash)) {
    return { ok: false, error: 'token inválido' };
  }

  return {
    ok: true,
    edge_id,
    company_id,
    agentId: agentRow.id
  };
}

module.exports = {
  timingSafeEqualHex,
  hashEdgeToken,
  validateEdgeCredentials
};
