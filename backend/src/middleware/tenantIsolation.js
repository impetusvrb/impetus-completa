/**
 * MULTI-TENANT REAL - Isolamento absoluto entre empresas
 * Garante que TODAS as queries contenham company_id = user.company_id
 * Nunca permitir acesso cruzado.
 */

const { logAction } = require('./audit');

/**
 * Middleware que injeta company_id e valida isolamento.
 * Obriga que req.tenantContext esteja disponível com company_id válido.
 */
function requireTenantIsolation(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Não autenticado', code: 'AUTH_REQUIRED' });
  }

  const companyId = user.company_id;
  if (!companyId) {
    return res.status(403).json({
      ok: false,
      error: 'Usuário não possui empresa associada',
      code: 'TENANT_NO_COMPANY'
    });
  }

  req.tenantContext = {
    company_id: companyId,
    user_id: user.id
  };

  next();
}

/**
 * Valida que o resource solicitado pertence à empresa do usuário.
 * Uso: sameCompany('params.companyId') ou sameCompany('body.company_id')
 */
function sameCompany(source) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Não autenticado' });
    }

    const parts = source.split('.');
    let value = req;
    for (const p of parts) {
      value = value?.[p];
    }

    if (value && value !== user.company_id) {
      logAction({
        companyId: user.company_id,
        userId: user.id,
        action: 'access_denied',
        entityType: 'tenant',
        description: `Tentativa de acesso cruzado: company ${value} != ${user.company_id}`,
        ipAddress: req.ip,
        severity: 'critical',
        success: false
      }).catch(() => {});
      return res.status(403).json({
        ok: false,
        error: 'Acesso negado - recurso de outra empresa',
        code: 'TENANT_ACCESS_DENIED'
      });
    }
    next();
  };
}

/**
 * Helper para construir WHERE company_id em queries.
 * Uso: const { where, params } = tenantWhere(req, 1);
 *       db.query('SELECT * FROM x WHERE ' + where, params);
 */
function tenantWhere(req, paramOffset = 1) {
  const companyId = req.tenantContext?.company_id || req.user?.company_id;
  if (!companyId) {
    throw new Error('company_id não disponível no contexto');
  }
  return {
    where: 'company_id = $' + paramOffset,
    params: [companyId],
    companyId
  };
}

module.exports = { requireTenantIsolation, sameCompany, tenantWhere };
