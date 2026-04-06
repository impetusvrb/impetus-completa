'use strict';

const db = require('../db');

async function logAdminAction({ adminUserId, acao, entidade, entidadeId, detalhes, ip }) {
  try {
    const detJson =
      detalhes == null
        ? null
        : typeof detalhes === 'string'
          ? detalhes
          : JSON.stringify(detalhes);
    await db.query(
      `INSERT INTO admin_logs (admin_user_id, acao, entidade, entidade_id, detalhes, ip)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        adminUserId || null,
        acao,
        entidade || null,
        entidadeId != null ? String(entidadeId) : null,
        detJson,
        ip || null
      ]
    );
  } catch (e) {
    console.error('[adminPortalLogService]', e.message);
  }
}

module.exports = { logAdminAction };
