const db = require('../db');

/**
 * Garante que a empresa do usuário existe e está ativa (coluna companies.active).
 */
async function requireCompanyActive(req, res, next) {
  try {
    const cid = req.user?.company_id;
    if (!cid) {
      return res.status(403).json({ ok: false, error: 'Empresa não vinculada ao usuário' });
    }
    const r = await db.query(
      `SELECT id, active, tenant_status, subscription_status FROM companies WHERE id = $1`,
      [cid]
    );
    if (!r.rows.length) {
      return res.status(403).json({ ok: false, error: 'Empresa inativa ou não encontrada' });
    }
    const row = r.rows[0];
    const ts = row.tenant_status || (row.active ? 'ativo' : 'suspenso');
    if (!['teste', 'ativo'].includes(ts)) {
      return res.status(403).json({
        ok: false,
        error: 'Empresa suspensa ou cancelada. Contate o suporte IMPETUS.',
        code: 'TENANT_BLOCKED'
      });
    }
    if (row.active !== true) {
      const subStatus = String(row.subscription_status || '').toLowerCase();
      const billingInactive = ['overdue', 'suspended', 'pending', 'canceled'].includes(subStatus);
      return res.status(403).json({
        ok: false,
        error: billingInactive
          ? 'Assinatura em atraso. Regularize o pagamento para continuar.'
          : 'Empresa inativa ou não encontrada',
        code: 'COMPANY_INACTIVE',
        redirect: '/subscription-expired'
      });
    }
    next();
  } catch (e) {
    next(e);
  }
}

module.exports = { requireCompanyActive };
