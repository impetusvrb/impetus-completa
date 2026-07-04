/**
 * Gateways de pagamento globais IMPETUS — somente super_admin.
 * Credenciais nunca expostas ao frontend (apenas estado enabled/config seguro).
 */
'use strict';

const express = require('express');
const router = express.Router();
const billingGatewayService = require('../../services/billingGatewayService');
const { requireAdminAuth, requireAdminProfiles } = require('../../middleware/adminPortalAuth');

const requireSuperAdmin = [requireAdminAuth, requireAdminProfiles('super_admin')];

router.get('/', ...requireSuperAdmin, async (_req, res) => {
  try {
    res.json({ ok: true, gateways: await billingGatewayService.listGateways() });
  } catch (err) {
    if (String(err.message).includes('billing_gateway_config')) {
      return res.status(503).json({ ok: false, error: 'Migração billing_gateway_config pendente.' });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.patch('/:provider', ...requireSuperAdmin, async (req, res) => {
  try {
    const gateway = await billingGatewayService.updateGateway(
      req.params.provider,
      { enabled: req.body?.enabled === true, config: req.body?.config },
      req.adminUser?.id
    );
    res.json({ ok: true, gateway });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ ok: false, error: err.message });
  }
});

module.exports = router;
