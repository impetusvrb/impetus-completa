'use strict';

const crypto = require('crypto');
const db = require('../../db');

const REQUIRED = [
  'tenantId',
  'companyId',
  'workspaceId',
  'walletId',
  'userId',
  'requestId'
];

/**
 * Resolve contexto financeiro obrigatório para qualquer cobrança IA.
 * tenantId = companyId na IMPETUS (isolamento por empresa).
 */
async function resolveBillingContext(input = {}) {
  const companyId = input.companyId || input.company_id || null;
  const userId = input.userId || input.user_id || null;
  const requestId = input.requestId || input.request_id || crypto.randomUUID();
  const traceId = input.traceId || input.trace_id || requestId;

  if (!companyId || !userId) {
    return {
      ok: false,
      code: 'MISSING_IDENTITY',
      message: 'companyId e userId são obrigatórios',
      attempt: { companyId, userId, requestId }
    };
  }

  const userCheck = await db.query(
    `SELECT id, company_id, active, deleted_at, department_id, company_role_id
     FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  const user = userCheck.rows[0];
  if (!user || user.deleted_at || user.active === false) {
    return { ok: false, code: 'USER_INVALID', message: 'Utilizador inválido ou inactivo' };
  }
  if (String(user.company_id) !== String(companyId)) {
    return {
      ok: false,
      code: 'CROSS_TENANT_USER',
      message: 'Utilizador não pertence à empresa autenticada'
    };
  }

  const walletRow = await db.query(
    `INSERT INTO nexus_company_wallets (company_id)
     VALUES ($1) ON CONFLICT (company_id) DO NOTHING`,
    [companyId]
  );
  void walletRow;

  const w = await db.query(
    `SELECT company_id, wallet_id, balance_credits, consumption_paused
     FROM nexus_company_wallets WHERE company_id = $1`,
    [companyId]
  );
  const wallet = w.rows[0];
  if (!wallet?.wallet_id) {
    return { ok: false, code: 'WALLET_MISSING', message: 'Carteira não encontrada' };
  }

  const walletId = input.walletId || input.wallet_id || wallet.wallet_id;
  if (String(walletId) !== String(wallet.wallet_id)) {
    return {
      ok: false,
      code: 'WALLET_MISMATCH',
      message: 'walletId não pertence à empresa'
    };
  }

  const tenantId = input.tenantId || input.tenant_id || companyId;
  const workspaceId = input.workspaceId || input.workspace_id || companyId;

  if (String(tenantId) !== String(companyId)) {
    return { ok: false, code: 'TENANT_MISMATCH', message: 'tenantId deve coincidir com companyId' };
  }

  const ctx = {
    tenantId: String(tenantId),
    companyId: String(companyId),
    workspaceId: String(workspaceId),
    walletId: String(walletId),
    departmentId: input.departmentId || input.department_id || user.department_id || null,
    userId: String(userId),
    sessionId: input.sessionId || input.session_id || null,
    conversationId: input.conversationId || input.conversation_id || null,
    requestId: String(requestId),
    traceId: String(traceId),
    ip: input.ip || null,
    userAgent: input.userAgent || input.user_agent || null
  };

  for (const key of REQUIRED) {
    if (!ctx[key]) {
      return { ok: false, code: 'MISSING_FIELD', message: `Campo obrigatório ausente: ${key}` };
    }
  }

  return { ok: true, context: ctx, wallet };
}

function logBlockedAttempt(code, ctx, extra = {}) {
  console.warn('[NEXUS_BILLING_ENGINE][BLOCKED]', {
    code,
    company_id: ctx?.companyId,
    wallet_id: ctx?.walletId,
    user_id: ctx?.userId,
    request_id: ctx?.requestId,
    ...extra
  });
}

module.exports = { resolveBillingContext, logBlockedAttempt, REQUIRED };
