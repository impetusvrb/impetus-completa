/**
 * Dashboard vivo: estado personalizado por perfil Impetus, escopo hierárquico e setor.
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const liveDashboardService = require('../services/liveDashboardService');

// Camada contextual (opcional; só expõe rotas de inspeção se carregada).
let _liveCtx = null;
try {
  _liveCtx = require('../liveDashboardContextual');
} catch (_) { /* tolerante */ }

function _isAdminOrAuditor(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase().trim();
  if (role === 'admin' || role === 'ceo') return true;
  if (Array.isArray(user.permissions) && (user.permissions.includes('*') || user.permissions.includes('VIEW_AUDIT_LOGS'))) return true;
  return false;
}

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

// ── Camada contextual — inspeção / governance (admin/auditor only) ──────
// Estas rotas NÃO afetam a renderização do painel; expõem apenas estado
// interno (telemetria, circuit breaker, decisão de modo).

router.get('/context/state', requireAuth, async (req, res) => {
  if (!_liveCtx) return res.status(503).json({ ok: false, error: 'contextual_layer_unavailable' });
  if (!_isAdminOrAuditor(req.user)) return res.status(403).json({ ok: false, error: 'forbidden' });
  try {
    const decision = _liveCtx.promotion.decideMode(req.user);
    const circuit = _liveCtx.promotion.getCircuitState();
    const summary = _liveCtx.telemetry.summary({ since: Date.now() - 24 * 3600 * 1000 });
    return res.json({
      ok: true,
      generated_at: new Date().toISOString(),
      decision,
      circuit_breaker: circuit,
      experience_summary_24h: summary,
      telemetry_buffer: _liveCtx.telemetry.size()
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'erro' });
  }
});

router.post('/context/fallback', requireAuth, express.json({ limit: '4kb' }), async (req, res) => {
  if (!_liveCtx) return res.status(503).json({ ok: false, error: 'contextual_layer_unavailable' });
  if (!_isAdminOrAuditor(req.user)) return res.status(403).json({ ok: false, error: 'forbidden' });
  const reason = String(req.body?.reason || 'manual_admin').slice(0, 200);
  _liveCtx.promotion.forceFallback(reason);
  return res.json({ ok: true, forced_fallback: true, reason });
});

router.post('/context/clear-fallback', requireAuth, async (req, res) => {
  if (!_liveCtx) return res.status(503).json({ ok: false, error: 'contextual_layer_unavailable' });
  if (!_isAdminOrAuditor(req.user)) return res.status(403).json({ ok: false, error: 'forbidden' });
  _liveCtx.promotion.clearForceFallback();
  return res.json({ ok: true, forced_fallback: false });
});

router.get('/context/telemetry', requireAuth, async (req, res) => {
  if (!_liveCtx) return res.status(503).json({ ok: false, error: 'contextual_layer_unavailable' });
  if (!_isAdminOrAuditor(req.user)) return res.status(403).json({ ok: false, error: 'forbidden' });
  const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 100));
  const filter = {};
  if (req.query.user_id) filter.user_id = String(req.query.user_id);
  if (req.query.mode) filter.mode = String(req.query.mode);
  return res.json({
    ok: true,
    summary: _liveCtx.telemetry.summary(filter),
    recent: _liveCtx.telemetry.getRecent(filter, limit)
  });
});

module.exports = router;
