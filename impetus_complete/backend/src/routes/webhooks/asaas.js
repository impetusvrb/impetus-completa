/**
 * ASAS WEBHOOK
 * Recebe eventos de pagamento e assinatura
 * POST /api/webhooks/asaas
 * Segurança: valida token + IP de origem
 */

const express = require('express');
const router = express.Router();
const db = require('../../db');
const asaasService = require('../../services/asaasService');

router.post('/', async (req, res) => {
  res.status(200).json({ received: true });

  setImmediate(async () => {
    let logId = null;
    try {
      if (!asaasService.validateWebhookToken(req)) {
        console.warn('[ASAAS_WEBHOOK] Token inválido');
        return;
      }

      const clientIp = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection?.remoteAddress;
      if (!asaasService.isAllowedWebhookIp(clientIp)) {
        console.warn('[ASAAS_WEBHOOK] IP não autorizado:', clientIp);
        return;
      }

      const body = req.body || {};
      const event = body.event;
      const payment = body.payment || {};
      const subscription = body.subscription || payment.subscription || {};

      const logRes = await db.query(`
        INSERT INTO asaas_webhook_logs (event_type, payload, processed)
        VALUES ($1, $2, false)
        RETURNING id
      `, [event, body]);

      logId = logRes.rows[0]?.id;

      switch (event) {
        case 'PAYMENT_CONFIRMED':
          await asaasService.handlePaymentConfirmed(payment, subscription);
          break;
        case 'PAYMENT_RECEIVED':
          await asaasService.handlePaymentReceived(payment, subscription);
          break;
        case 'PAYMENT_OVERDUE':
          await asaasService.handlePaymentOverdue(payment, subscription);
          break;
        case 'SUBSCRIPTION_CANCELED':
        case 'SUBSCRIPTION_DELETED':
          await asaasService.handleSubscriptionCanceled(subscription);
          break;
        default:
          console.log('[ASAAS_WEBHOOK] Evento ignorado:', event);
      }

      if (logId) {
        await db.query(
          'UPDATE asaas_webhook_logs SET processed = true, processed_at = now() WHERE id = $1',
          [logId]
        );
      }
    } catch (err) {
      console.error('[ASAAS_WEBHOOK_ERROR]', err);
      if (logId) {
        await db.query(
          'UPDATE asaas_webhook_logs SET error_message = $1 WHERE id = $2',
          [err.message, logId]
        ).catch(() => {});
      }
    }
  });
});

module.exports = router;
