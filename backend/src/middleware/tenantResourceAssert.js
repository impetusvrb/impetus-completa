'use strict';

const db = require('../db');
const { isValidUUID } = require('../utils/security');

/** Consultas allowlisted: reforço IDOR antes de mutações em rotas admin críticas. */
const RESOURCE_SPECS = Object.freeze({
  company_role: 'SELECT company_id AS cid FROM company_roles WHERE id = $1',
  structural_asset: 'SELECT company_id AS cid FROM assets WHERE id = $1'
});

/**
 * Garante que o recurso exista e pertença à empresa da sessão.
 * Resposta uniforme 404 se inexistente ou se company_id não coincidir (sem vazamento entre tenants).
 */
async function assertResourceCompanyMatch(resourceKey, resourceId, sessionCompanyId) {
  if (!sessionCompanyId) {
    return { ok: false, status: 400, error: 'Empresa não identificada' };
  }
  if (!isValidUUID(String(resourceId))) {
    return { ok: false, status: 400, error: 'ID inválido' };
  }
  const sql = RESOURCE_SPECS[resourceKey];
  if (!sql) {
    return { ok: false, status: 500, error: 'Configuração interna de tenant inválida' };
  }
  const r = await db.query(sql, [resourceId]);
  if (r.rows.length === 0 || String(r.rows[0].cid) !== String(sessionCompanyId)) {
    return { ok: false, status: 404, error: 'Recurso não encontrado' };
  }
  return { ok: true };
}

function tenantAssertMiddleware(resourceKey, paramName = 'id') {
  return async (req, res, next) => {
    try {
      const out = await assertResourceCompanyMatch(resourceKey, req.params[paramName], req.user?.company_id);
      if (!out.ok) {
        return res.status(out.status).json({ ok: false, error: out.error });
      }
      next();
    } catch (e) {
      console.error('[TENANT_ASSERT]', e);
      return res.status(500).json({ ok: false, error: 'Erro ao validar recurso' });
    }
  };
}

module.exports = {
  assertResourceCompanyMatch,
  tenantAssertMiddleware
};
