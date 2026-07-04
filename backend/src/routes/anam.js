'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const anamService = require('../services/anamService');
const billingTokenService = require('../services/billingTokenService');
const { fromAuthUser, usageMeta } = require('../services/nexusBillingEngine/billingMetaHelper');

const router = express.Router();

async function anamBillingPrecheck(user, req) {
  if (!user?.company_id) return null;
  try {
    const billingEngine = require('../services/nexusBillingEngine');
    if (billingEngine.isEnabled()) {
      const ctx = fromAuthUser(user, req, { operation: 'anam_session' });
      const auth = await billingEngine.authorizeConsumption(ctx, { servico: 'akool', quantidade: 1 });
      if (!auth.ok && !auth.skipped) return 'Créditos Nexus IA insuficientes para iniciar sessão Anam.';
      return null;
    }
  } catch (_) {
    /* legacy */
  }
  const nexusWalletService = require('../services/nexusWalletService');
  const r = await nexusWalletService.canConsumeEstimate(user.company_id, 'akool', 1);
  if (r.skipped || r.ok) return null;
  return 'Créditos Nexus IA insuficientes para iniciar sessão Anam.';
}

async function sendPublicConfig(res) {
  try {
    const cfg = await anamService.getPublicConfig();
    res.json({ ok: true, ...cfg });
  } catch (e) {
    console.error('[anam] public-config', e.message);
    res.status(500).json({ ok: false, error: e.message || 'Erro ao ler config Anam' });
  }
}

/**
 * GET /api/anam/public-config — sem auth (só enabled + personaId; sem segredos).
 * Usado pelo overlay para saber se o servidor está pronto antes do JWT.
 */
router.get('/public-config', (req, res) => {
  void sendPublicConfig(res);
});

/**
 * GET /api/anam/config — estado público (sem expor API key).
 */
router.get('/config', requireAuth, (req, res) => {
  void sendPublicConfig(res);
});

/**
 * POST /api/anam/prepare — limpa cache de token antes de nova sessão WebRTC (evita concorrência).
 */
router.post('/prepare', requireAuth, (req, res) => {
  const label = `impetus-user-${req.user?.id || 'unknown'}`;
  const { cleared } = anamService.clearSessionTokenCache(label);
  return res.json({ ok: true, cleared });
});

/**
 * POST /api/anam/session-token
 * body opcional: { personaId, userDisplayName, localHour, timezone }
 */
router.post('/session-token', requireAuth, async (req, res) => {
  try {
    const blocked = await anamBillingPrecheck(req.user, req);
    if (blocked) {
      return res.status(402).json({ ok: false, error: blocked, code: 'INSUFFICIENT_BALANCE' });
    }
    const personaId = req.body?.personaId;
    const userFromDb = String(req.user?.name || req.user?.full_name || '').trim();
    const data = await anamService.createSessionToken({
      personaId,
      user: req.user,
      clientLabel: `impetus-user-${req.user?.id || 'unknown'}`,
      sessionContext: {
        userDisplayName:
          String(req.body?.userDisplayName || '').trim() || userFromDb,
        localHour: req.body?.localHour,
        timezone: req.body?.timezone
      }
    });
    if (req.user?.company_id) {
      const ctx = fromAuthUser(req.user, req, { operation: 'anam_session' });
      billingTokenService.registrarUsoSafe(
        req.user.company_id,
        req.user.id,
        'akool',
        1,
        'session',
        usageMeta('anam', personaId || 'default', { ...ctx, operation: 'anam_session' })
      );
    }
    return res.json({ ok: true, ...data });
  } catch (e) {
    if (e.code === 'ANAM_NOT_CONFIGURED') {
      return res.status(503).json({ ok: false, error: e.message, code: e.code });
    }
    if (e.code === 'ANAM_RATE_LIMIT' || e.code === 'ANAM_API_ERROR') {
      // Nunca reencaminhar 401/403 da API Anam (externa) como HTTP 401 para o cliente.
      // O HTTP 401 do IMPETUS significa "utilizador não autenticado". Neste caso, o
      // utilizador ESTÁ autenticado — a falha é de configuração do serviço externo Anam
      // (API key inválida ou revogada). Usar 503 para não disparar logout global no frontend.
      let status = e.status && e.status >= 400 ? e.status : 502;
      if (status === 401 || status === 403) status = 503;
      if (status === 429) {
        res.set('Retry-After', '120');
      }
      return res.status(status).json({
        ok: false,
        error: e.message,
        code: e.code,
        details: e.details
      });
    }
    console.error('[anam] session-token', e.message);
    return res.status(500).json({ ok: false, error: e.message || 'Erro ao criar sessão Anam' });
  }
});

module.exports = router;
