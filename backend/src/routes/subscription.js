/**
 * ROTAS DE ASSINATURA
 * Link de pagamento - acessível quando company está inativa (usuário bloqueado)
 * Permite regularizar via boleto sem precisar de empresa ativa
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getSubscriptionPaymentLink } = require('../services/asaasService');
const db = require('../db');

/**
 * GET /api/subscription/payment-link
 * Retorna URL de pagamento (boleto) para regularizar assinatura em atraso
 * Requer autenticação, mas NÃO requer company ativa (usuário bloqueado pode acessar)
 */
router.get('/payment-link', requireAuth, async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) {
      return res.status(400).json({
        ok: false,
        error: 'Usuário não vinculado a empresa'
      });
    }

    const companyRes = await db.query(
      'SELECT id, active FROM companies WHERE id = $1',
      [companyId]
    );
    if (companyRes.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Empresa não encontrada' });
    }

    if (companyRes.rows[0].active) {
      return res.status(400).json({
        ok: false,
        error: 'Empresa já está ativa'
      });
    }

    const paymentUrl = await getSubscriptionPaymentLink(companyId);
    res.json({
      ok: true,
      paymentUrl: paymentUrl || null
    });
  } catch (err) {
    console.error('[SUBSCRIPTION_PAYMENT_LINK]', err);
    res.status(500).json({ ok: false, error: 'Erro ao obter link de pagamento' });
  }
});

module.exports = router;
