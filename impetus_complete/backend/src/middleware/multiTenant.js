/**
 * MIDDLEWARE MULTI-TENANT
 * Isolamento de dados, validação de empresa ativa
 */

const db = require('../db');
const { logAction } = require('./audit');

/**
 * Bloqueia acesso se empresa estiver inativa
 */
async function requireCompanyActive(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Não autenticado' });
  }

  if (!user.company_id && !user.is_first_access) {
    return res.status(403).json({
      ok: false,
      error: 'Conta não vinculada a uma empresa. Conclua o setup em /setup-empresa ou entre em contato com o suporte.',
      code: 'NO_COMPANY'
    });
  }

  if (user.is_first_access || !user.company_id) {
    return next();
  }

  try {
    const r = await db.query(
      'SELECT id, name, active, plan_type FROM companies WHERE id = $1',
      [user.company_id]
    );

    if (r.rows.length === 0) {
      return res.status(403).json({
        ok: false,
        error: 'Empresa não encontrada.',
        code: 'COMPANY_NOT_FOUND'
      });
    }

    const company = r.rows[0];
    if (!company.active) {
      await logAction({
        companyId: user.company_id,
        userId: user.id,
        action: 'access_denied',
        entityType: 'company',
        description: 'Tentativa de acesso com empresa inativa/suspensa',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'warning',
        success: false
      }).catch(() => {});

      return res.status(403).json({
        ok: false,
        error: 'Assinatura em atraso. Regularize o pagamento para continuar.',
        code: 'COMPANY_INACTIVE',
        redirect: '/subscription-expired'
      });
    }

    req.company = company;
    next();
  } catch (err) {
    console.error('[REQUIRE_COMPANY_ACTIVE]', err);
    res.status(500).json({
      ok: false,
      error: 'Erro ao validar empresa'
    });
  }
}

/**
 * Garante que company_id está presente (para rotas que exigem)
 */
function requireCompanyContext(req, res, next) {
  if (!req.user?.company_id) {
    return res.status(403).json({
      ok: false,
      error: 'Contexto de empresa obrigatório',
      code: 'COMPANY_CONTEXT_REQUIRED'
    });
  }
  next();
}

/**
 * Valida que o recurso pertence à empresa do usuário
 */
function validateCompanyResource(getCompanyIdFromReq) {
  return async (req, res, next) => {
    const userCompanyId = req.user?.company_id;
    if (!userCompanyId) {
      return res.status(403).json({ ok: false, error: 'Sem contexto de empresa' });
    }

    const resourceCompanyId = typeof getCompanyIdFromReq === 'function'
      ? getCompanyIdFromReq(req)
      : req.params.companyId || req.body.company_id || req.query.company_id;

    if (resourceCompanyId && resourceCompanyId !== userCompanyId) {
      await logAction({
        companyId: userCompanyId,
        userId: req.user?.id,
        action: 'access_denied',
        entityType: 'cross_tenant',
        description: `Tentativa de acesso a recurso de outra empresa: ${resourceCompanyId}`,
        ipAddress: req.ip,
        severity: 'critical',
        success: false
      }).catch(() => {});

      return res.status(403).json({
        ok: false,
        error: 'Acesso negado - recurso de outra empresa',
        code: 'CROSS_TENANT_DENIED'
      });
    }
    next();
  };
}

module.exports = {
  requireCompanyActive,
  requireCompanyContext,
  validateCompanyResource
};
