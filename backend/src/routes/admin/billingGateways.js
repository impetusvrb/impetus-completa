/**
 * Gateways de pagamento globais IMPETUS — somente super_admin.
 * Credenciais nunca expostas ao frontend (apenas estado enabled/config seguro).
 */
'use strict';

const express = require('express');
const router = express.Router();
const db = require('../../db');
const { requireAdminAuth, requireAdminProfiles } = require('../../middleware/adminPortalAuth');

const requireSuperAdmin = [requireAdminAuth, requireAdminProfiles('super_admin')];

router.get('/', ...requireSuperAdmin, async (_req, res) => {
  try {
    const r = await db.query(
      `SELECT provider, enabled, config, updated_at FROM billing_gateway_config ORDER BY provider`
    );
    res.json({
      ok: true,
      gateways: r.rows.map((g) => ({
        provider: g.provider,
        enabled: g.enabled === true,
        config: g.config || {},
        updated_at: g.updated_at
      }))
    });
  } catch (err) {
    if (String(err.message).includes('billing_gateway_config')) {
      return res.status(503).json({ ok: false, error: 'Migração billing_gateway_config pendente.' });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.patch('/:provider', ...requireSuperAdmin, async (req, res) => {
  try {
    const provider = String(req.params.provider || '').toLowerCase();
    const allowed = ['stripe', 'mercadopago', 'asaas', 'pagbank', 'pagarme', 'paypal'];
    if (!allowed.includes(provider)) {
      return res.status(400).json({ ok: false, error: 'Gateway inválido.' });
    }
    const enabled = req.body?.enabled === true;
    const config = req.body?.config && typeof req.body.config === 'object' ? req.body.config : {};
    const r = await db.query(
      `UPDATE billing_gateway_config SET enabled = $2, config = $3::jsonb, updated_by = $4, updated_at = now()
       WHERE provider = $1 RETURNING provider, enabled, config, updated_at`,
      [provider, enabled, JSON.stringify(config), req.user?.id || null]
    );
    if (!r.rows[0]) {
      return res.status(404).json({ ok: false, error: 'Gateway não encontrado.' });
    }
    res.json({ ok: true, gateway: r.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
