/**
 * ROTAS DE IDENTIFICAÇÃO E ATIVAÇÃO
 * GET /status - Status atual (needs_activation | needs_daily_verify | verified)
 * POST /activation/start - Inicia conversa de ativação (IA pergunta)
 * POST /activation/respond - Responde na conversa (no final, IA solicita PIN)
 * POST /first-access - Completar ativação em lote (formulário - legado)
 * POST /daily-verify - Verificação diária (nome, pin)
 * POST /seed-registry - Admin: popular registered_names
 */
const express = require('express');
const router = express.Router();
const userIdentification = require('../services/userIdentificationService');
const activationConversation = require('../services/activationConversationService');
const { requireAuth } = require('../middleware/auth');
const { requireCompanyActive } = require('../middleware/multiTenant');

function auditContext(req) {
  return {
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent')
  };
}

/**
 * GET /status - Tratado em app.js (apenas requireAuth, sem requireCompanyActive)
 */

/**
 * POST /api/user-identification/activation/start
 * Inicia ou retoma conversa de ativação - retorna primeira pergunta da IA
 */
router.post('/activation/start', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const result = await activationConversation.startActivation(req.user, auditContext(req));
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[ACTIVATION_START_ERROR]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/user-identification/activation/respond
 * Body: { answer }
 * Processa resposta e retorna próxima pergunta ou { completed: true }
 */
router.post('/activation/respond', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const { answer } = req.body;
    const result = await activationConversation.processActivationAnswer(req.user, answer, auditContext(req));
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[ACTIVATION_RESPOND_ERROR]', err);
    res.status(400).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/user-identification/first-access
 * Body: { fullName, department, jobTitle, dailyActivities, pin } (formulário direto - legado)
 */
router.post('/first-access', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const { fullName, department, jobTitle, dailyActivities, pin } = req.body;
    const result = await userIdentification.completeFirstAccess(req.user, {
      fullName,
      department,
      jobTitle,
      dailyActivities,
      pin
    }, auditContext(req));
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[IDENTIFICATION_FIRST_ACCESS_ERROR]', err);
    res.status(400).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/user-identification/daily-verify
 * Body: { fullName, pin }
 */
router.post('/daily-verify', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const { fullName, pin } = req.body;
    const result = await userIdentification.verifyDailyAccess(req.user, fullName, pin, auditContext(req));
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[IDENTIFICATION_DAILY_VERIFY_ERROR]', err);
    res.status(400).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/user-identification/seed-registry
 * Admin: popula registered_names com users da empresa (simulação)
 */
router.post('/seed-registry', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const count = await userIdentification.seedRegisteredNamesFromUsers(companyId);
    res.json({ ok: true, seeded: count });
  } catch (err) {
    console.error('[IDENTIFICATION_SEED_ERROR]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
