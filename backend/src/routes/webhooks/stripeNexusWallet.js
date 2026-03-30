/**
 * Stripe webhook — Nexus IA carteira (raw body obrigatório)
 * POST /api/webhooks/stripe-nexus-wallet
 */
'use strict';

const nexusWalletService = require('../../services/nexusWalletService');

module.exports = async function stripeNexusWalletWebhook(req, res) {
  try {
    const sig = req.headers['stripe-signature'];
    const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    const r = await nexusWalletService.handleStripeWebhook(buf, sig);
    if (r.error === 'invalid_signature') {
      return res.status(400).send(`signature_invalid`);
    }
    if (r.error === 'webhook_secret_missing') {
      return res.status(503).json({ ok: false, error: r.error });
    }
    return res.json({ received: true, ...r });
  } catch (err) {
    console.error('[STRIPE_NEXUS_WEBHOOK]', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
