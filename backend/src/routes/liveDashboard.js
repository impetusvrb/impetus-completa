/**
 * Dashboard vivo: estado personalizado por perfil Impetus, escopo hierárquico e setor.
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const liveDashboardService = require('../services/liveDashboardService');

router.get('/state', requireAuth, async (req, res) => {
  try {
    const state = await liveDashboardService.buildLiveStateForUser(req.user);
    if (!state.ok) {
      return res.status(400).json(state);
    }
    return res.json(state);
  } catch (err) {
    console.error('[LIVE_DASHBOARD_STATE]', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Erro ao montar painel' });
  }
});

/** Histórico persistido — ainda não implementado; evita 404 no frontend. */
router.get('/snapshots', requireAuth, async (req, res) => {
  res.json({ ok: true, snapshots: [] });
});

router.get('/snapshot-at', requireAuth, async (req, res) => {
  res.json({ ok: true, snapshot: null });
});

router.post('/orchestration/execute', requireAuth, express.json({ limit: '32kb' }), async (req, res) => {
  try {
    const out = await liveDashboardService.executeOrchestrationStash(req.user, req.body);
    if (!out.ok) return res.status(400).json(out);
    return res.json(out);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'Erro' });
  }
});

module.exports = router;
