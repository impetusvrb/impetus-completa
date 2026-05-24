'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const anamService = require('../services/anamService');

const router = express.Router();

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
    return res.json({ ok: true, ...data });
  } catch (e) {
    if (e.code === 'ANAM_NOT_CONFIGURED') {
      return res.status(503).json({ ok: false, error: e.message, code: e.code });
    }
    if (e.code === 'ANAM_RATE_LIMIT' || e.code === 'ANAM_API_ERROR') {
      const status = e.status && e.status >= 400 ? e.status : 502;
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
