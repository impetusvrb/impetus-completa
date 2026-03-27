/**
 * NexusIA — custos de tokens (visão cliente: totais apenas)
 * GET /api/admin/nexus-custos?ano=&mes=
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const billingTokenService = require('../../services/billingTokenService');

function requireCompanyAdmin(req, res, next) {
  const role = String(req.user?.role || '').toLowerCase();
  if (role !== 'admin') {
    return res.status(403).json({
      ok: false,
      error: 'Acesso restrito ao administrador da empresa.',
      code: 'NEXUS_CUSTOS_ADMIN_ONLY'
    });
  }
  next();
}

router.get('/', requireAuth, requireCompanyAdmin, async (req, res) => {
  try {
    if (!billingTokenService.ENABLED) {
      return res.status(503).json({
        ok: false,
        error: 'Módulo de custos NexusIA desativado.',
        code: 'NEXUS_BILLING_DISABLED'
      });
    }
    const companyId = req.user.company_id;
    if (!companyId) {
      return res.status(400).json({ ok: false, error: 'Empresa não associada ao usuário.' });
    }
    const data = await billingTokenService.getClienteCustosResumo(
      companyId,
      req.query.ano,
      req.query.mes
    );
    res.json(data);
  } catch (err) {
    const status = err.status || 500;
    console.error('[NEXUS_CUSTOS]', err.message);
    res.status(status).json({ ok: false, error: err.message || 'Erro ao carregar custos' });
  }
});

module.exports = router;
