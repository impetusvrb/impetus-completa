/**
 * WEBHOOK Z-API
 * Recebe mensagens e eventos (ConnectedCallback, etc) do Z-API
 * Multi-tenant: identifica empresa por instance_id
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const zapi = require('../services/zapi');
const companyIntegration = require('../models/companyIntegration');
const { logAction } = require('../middleware/audit');

/**
 * POST /api/webhook/zapi
 * Webhook principal - mensagens e eventos (connected, disconnected, etc)
 */
router.post('/', async (req, res) => {
  try {
    const payload = req.body;
    const instanceId = payload.instanceId || payload.instance_id || req.query.instanceId;
    const eventType = payload.type || payload.event || 'message';

    if (!instanceId) {
      console.warn('[ZAPI_WEBHOOK] Sem instanceId no payload');
      return res.json({ ok: true, warning: 'Instance ID missing' });
    }

    console.log('[ZAPI_WEBHOOK]', eventType, 'instance=' + instanceId);

    let companyId = await companyIntegration.getCompanyByInstanceId(instanceId);
    if (!companyId) {
      const fallback = await db.query(
        'SELECT company_id FROM zapi_configurations WHERE instance_id = $1 AND active = true',
        [instanceId]
      );
      companyId = fallback.rows[0]?.company_id;
    }
    const cid = companyId;

    if (!cid) {
      return res.json({ ok: true, warning: 'Instance not configured' });
    }

    if (eventType === 'ConnectedCallback' && payload.connected === true) {
      await companyIntegration.markConnected(cid, instanceId, payload.phone);
      await db.query(`
        UPDATE whatsapp_instances SET status = 'connected', business_phone = $1, updated_at = now()
        WHERE instance_id = $2
      `, [payload.phone || null, instanceId]).catch(() => {});
      await logAction({
        companyId: cid,
        action: 'zapi_connected',
        entityType: 'zapi_config',
        description: `WhatsApp conectado: ${payload.phone || ''}`,
        changes: { phone: payload.phone },
        severity: 'info'
      });
      return res.json({ ok: true, event: 'connected' });
    }

    if (eventType === 'DisconnectedCallback') {
      await db.query(`
        UPDATE zapi_configurations
        SET integration_status = 'disconnected', connection_status = 'error', updated_at = now()
        WHERE company_id = $1
      `, [cid]);
      await db.query(`UPDATE whatsapp_instances SET status = 'disconnected', updated_at = now() WHERE company_id = $1 AND instance_id = $2`, [cid, instanceId]).catch(() => {});
      return res.json({ ok: true, event: 'disconnected' });
    }

    await zapi.processWebhook(cid, payload);

    await logAction({
      companyId: cid,
      action: 'zapi_webhook_received',
      entityType: 'communication',
      description: 'Webhook Z-API processado',
      severity: 'debug'
    });

    res.json({ ok: true, processed: true });
  } catch (err) {
    console.error('[ZAPI_WEBHOOK_ERROR]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/zapi/webhook/test
 * Endpoint de teste do webhook
 */
router.get('/test', (req, res) => {
  res.json({
    ok: true,
    message: 'Webhook Z-API Impetus está funcionando',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
