'use strict';

/**
 * IMPETUS — Tenant Isolation Guard (Enterprise Hardening Bloco 2)
 *
 * Política canónica para extração de `company_id` em handlers que tocam
 * entidades multi-tenant.
 *
 * Regras invioláveis:
 *   1. company_id é SEMPRE proveniente de `req.user.company_id`.
 *   2. body/query/params nunca sobrescrevem.
 *   3. se um body/query/param `company_id` for enviado e divergir do tenant
 *      autenticado, a request é REJEITADA (403) — não silenciada.
 *   4. helper assertSameTenant() para chamadas em serviços downstream.
 *
 * Aditivo e backward-compatible: handlers existentes continuam a funcionar.
 * Apenas oferecemos uma rede de segurança homogénea para os novos handlers
 * (e para guard explícito em endpoints sensíveis).
 */

function getAuthenticatedCompanyId(req) {
  return req && req.user && req.user.company_id != null
    ? String(req.user.company_id)
    : null;
}

function getSubmittedCompanyId(req) {
  const fromBody = req?.body && req.body.company_id != null ? String(req.body.company_id) : null;
  const fromQuery = req?.query && req.query.company_id != null ? String(req.query.company_id) : null;
  const fromParams = req?.params && req.params.company_id != null ? String(req.params.company_id) : null;
  return fromBody || fromQuery || fromParams || null;
}

/**
 * Middleware: garante presença de company_id autenticado e rejeita tentativas
 * de forging via body/query/params.
 */
function tenantIsolationGuard(req, res, next) {
  const auth = getAuthenticatedCompanyId(req);
  if (!auth) {
    return res.status(403).json({
      ok: false,
      error: 'TENANT_CONTEXT_MISSING',
      code: 'TENANT_CONTEXT_MISSING'
    });
  }
  const submitted = getSubmittedCompanyId(req);
  if (submitted && submitted !== auth) {
    try {
      console.warn(
        '[TENANT_ISOLATION_VIOLATION]',
        JSON.stringify({
          event: 'TENANT_ISOLATION_VIOLATION',
          user_id: req.user?.id || null,
          authenticated_company_id: auth,
          submitted_company_id: submitted,
          path: req.originalUrl || req.path,
          at: new Date().toISOString()
        })
      );
    } catch (_e) {
      /* ignore */
    }
    return res.status(403).json({
      ok: false,
      error: 'TENANT_MISMATCH',
      code: 'TENANT_MISMATCH'
    });
  }
  req._tenantCompanyId = auth;
  return next();
}

/**
 * Helper para serviços downstream. Lança caso o expected divirja do received.
 */
function assertSameTenant(expectedCompanyId, receivedCompanyId, context = 'unspecified') {
  const e = expectedCompanyId != null ? String(expectedCompanyId) : null;
  const r = receivedCompanyId != null ? String(receivedCompanyId) : null;
  if (!e || !r || e !== r) {
    const err = new Error(`TENANT_ASSERTION_FAILED: ${context}`);
    err.code = 'TENANT_ASSERTION_FAILED';
    err.expected = e;
    err.received = r;
    throw err;
  }
  return true;
}

module.exports = {
  tenantIsolationGuard,
  assertSameTenant,
  getAuthenticatedCompanyId
};
