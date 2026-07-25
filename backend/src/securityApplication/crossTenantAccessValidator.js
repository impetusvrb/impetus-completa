'use strict';

/**
 * APPSEC-01 — Cross-Tenant Access Validator
 * Validação única antes de INSERT/UPDATE envolvendo utilizadores ou recursos partilhados.
 */

const db = require('../db');

const AUDIT_EVENT = 'APPSEC_CROSS_TENANT_VALIDATION';

function auditValidation(outcome, meta) {
  try {
    console.info(
      `[${AUDIT_EVENT}]`,
      JSON.stringify({
        outcome,
        at: new Date().toISOString(),
        ...meta
      })
    );
  } catch (_) { /* never break */ }
}

/**
 * @param {string} userId
 * @param {string} companyId
 * @returns {Promise<{ ok: true, user: object } | { ok: false, error: string, status: number }>}
 */
async function assertUserBelongsToTenant(userId, companyId) {
  if (!userId || !companyId) {
    return { ok: false, error: 'user_id e company_id obrigatórios', status: 400 };
  }
  const { rows } = await db.query(
    `SELECT id, company_id, active, deleted_at
       FROM users
      WHERE id = $1
      LIMIT 1`,
    [userId]
  );
  const user = rows[0];
  if (!user) {
    auditValidation('DENY_USER_NOT_FOUND', { userId, companyId });
    return { ok: false, error: 'Utilizador não encontrado', status: 404 };
  }
  if (String(user.company_id) !== String(companyId)) {
    auditValidation('DENY_CROSS_TENANT', { userId, companyId, actualCompanyId: user.company_id });
    return { ok: false, error: 'Utilizador não pertence a este tenant', status: 403 };
  }
  if (user.deleted_at) {
    return { ok: false, error: 'Utilizador inactivo', status: 403 };
  }
  if (user.active === false) {
    return { ok: false, error: 'Utilizador inactivo', status: 403 };
  }
  return { ok: true, user };
}

/**
 * @param {string[]} userIds
 * @param {string} companyId
 */
async function assertUsersBelongToTenant(userIds, companyId) {
  const unique = [...new Set((userIds || []).filter(Boolean).map(String))];
  if (!unique.length) return { ok: true, users: [] };
  if (!companyId) {
    return { ok: false, error: 'company_id obrigatório', status: 400 };
  }

  const { rows } = await db.query(
    `SELECT id, company_id, active, deleted_at
       FROM users
      WHERE id = ANY($1::uuid[])`,
    [unique]
  );

  const byId = new Map(rows.map((r) => [String(r.id), r]));
  for (const uid of unique) {
    const row = byId.get(uid);
    if (!row) {
      auditValidation('DENY_USER_NOT_FOUND', { userId: uid, companyId });
      return { ok: false, error: 'Utilizador não encontrado', status: 404 };
    }
    if (String(row.company_id) !== String(companyId)) {
      auditValidation('DENY_CROSS_TENANT', { userId: uid, companyId, actualCompanyId: row.company_id });
      return { ok: false, error: 'Participante não pertence a este tenant', status: 403 };
    }
    if (row.deleted_at || row.active === false) {
      return { ok: false, error: 'Utilizador inactivo', status: 403 };
    }
  }
  auditValidation('ALLOW', { companyId, userCount: unique.length });
  return { ok: true, users: rows };
}

/**
 * Valida participantes de conversa / partilha antes de mutação.
 * @param {{ companyId: string, participantIds: string[], actorUserId?: string }} opts
 */
async function validateConversationParticipants(opts) {
  const ids = [...(opts.participantIds || [])];
  if (opts.actorUserId) ids.push(opts.actorUserId);
  return assertUsersBelongToTenant(ids, opts.companyId);
}

/**
 * @param {string} targetUserId
 * @param {string} companyId
 */
async function validatePrivateConversationTarget(targetUserId, companyId) {
  return assertUserBelongsToTenant(targetUserId, companyId);
}

/**
 * @param {string} newUserId
 * @param {string} companyId
 */
async function validateParticipantAddition(newUserId, companyId) {
  return assertUserBelongsToTenant(newUserId, companyId);
}

module.exports = {
  AUDIT_EVENT,
  assertUserBelongsToTenant,
  assertUsersBelongToTenant,
  validateConversationParticipants,
  validatePrivateConversationTarget,
  validateParticipantAddition
};
