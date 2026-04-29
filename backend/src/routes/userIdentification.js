/**
 * ROTAS DE IDENTIFICAÇÃO E ATIVAÇÃO (PRÉ-MONTAGEM)
 *
 * ⚠️ Não montado em server.js — sem impacto até useRoute/app.use futuro.
 *
 * SUBCONJUNTO seguro face a userIdentificationService.js oficial:
 * - Inclui apenas rotas cujos métodos existem hoje: completeFirstAccess + activationConversation.
 *
 * PENDENTE (paridade com legado) — exportar no serviço antes de expor estes handlers:
 * - verifyDailyAccess  → POST /daily-verify (frontend IdentificationModal)
 * - seedRegisteredNamesFromUsers → POST /seed-registry
 */
const express = require('express');
const router = express.Router();
const userIdentification = require('../services/userIdentificationService');
const activationConversation = require('../services/activationConversationService');
const { requireAuth } = require('../middleware/auth');
const { requireCompanyActive } = require('../middleware/multiTenant');

/** Alinha com logAudit do userIdentificationService (usa ip + userAgent). */
function auditContext(req) {
  const ip = req.ip || req.connection?.remoteAddress || null;
  return {
    ip,
    ipAddress: ip,
    userAgent: req.get('user-agent') || null
  };
}

/**
 * POST /api/user-identification/activation/start
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
 */
router.post('/activation/respond', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const { answer } = req.body;
    const result = await activationConversation.processActivationAnswer(
      req.user,
      answer,
      auditContext(req)
    );
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[ACTIVATION_RESPOND_ERROR]', err);
    res.status(400).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/user-identification/first-access
 */
router.post('/first-access', requireAuth, requireCompanyActive, async (req, res) => {
  try {
    const { fullName, department, jobTitle, dailyActivities, pin } = req.body;
    await userIdentification.completeFirstAccess(
      req.user,
      {
        fullName,
        department,
        jobTitle,
        dailyActivities,
        pin
      },
      auditContext(req)
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[IDENTIFICATION_FIRST_ACCESS_ERROR]', err);
    res.status(400).json({ ok: false, error: err.message });
  }
});

module.exports = router;
