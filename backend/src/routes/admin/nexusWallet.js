/**
 * Nexus IA — carteira de créditos, recarga Stripe, taxas por serviço, histórico
 * Base: /api/admin/nexus-wallet
 */
'use strict';

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const nexusWalletService = require('../../services/nexusWalletService');

function requireCompanyAdmin(req, res, next) {
  const role = String(req.user?.role || '').toLowerCase();
  if (role !== 'admin') {
    return res.status(403).json({
      ok: false,
      error: 'Acesso restrito ao administrador da empresa.',
      code: 'NEXUS_WALLET_ADMIN_ONLY'
    });
  }
  next();
}

const chain = [requireAuth, requireCompanyAdmin];

router.get('/', ...chain, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não associada.' });
    const limit = Math.min(200, Math.max(10, parseInt(req.query.ledger_limit, 10) || 40));
    const data = await nexusWalletService.getDashboard(companyId, limit);
    res.json({ ok: true, ...data });
  } catch (err) {
    console.error('[NEXUS_WALLET]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.patch('/settings', ...chain, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não associada.' });
    const row = await nexusWalletService.updateWalletSettings(companyId, req.body || {});
    res.json({ ok: true, wallet: row });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/checkout/stripe', ...chain, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não associada.' });
    const amount = Number(req.body?.amount_brl);
    const successUrl = String(req.body?.success_url || '').trim();
    const cancelUrl = String(req.body?.cancel_url || '').trim();
    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ ok: false, error: 'success_url e cancel_url obrigatórios.' });
    }
    const session = await nexusWalletService.createStripeCheckoutSession(
      companyId,
      amount,
      successUrl,
      cancelUrl
    );
    res.json({ ok: true, ...session });
  } catch (err) {
    const status = err.status || 500;
    console.error('[NEXUS_WALLET_CHECKOUT]', err.message);
    res.status(status).json({ ok: false, error: err.message });
  }
});

/** Placeholder PagSeguro — integração futura */
router.post('/checkout/pagseguro', ...chain, (_req, res) => {
  res.status(501).json({
    ok: false,
    code: 'PAGSEGURO_NOT_IMPLEMENTED',
    error:
      'PagSeguro ainda não configurado. Use Stripe ou contacte o suporte Impetus para habilitar outro gateway.'
  });
});

router.put('/rates/:servico', ...chain, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não associada.' });
    const credits = req.body?.credits_per_unit;
    const out = await nexusWalletService.upsertCompanyRate(companyId, req.params.servico, credits);
    res.json(out);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ ok: false, error: err.message });
  }
});

router.delete('/rates/:servico', ...chain, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não associada.' });
    const out = await nexusWalletService.deleteCompanyRate(companyId, req.params.servico);
    res.json(out);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
