/**
 * IMPETUS - Rotas do dashboard (perfil, módulos visíveis, layout personalizado)
 * GET /dashboard/me - já pode existir noutro lugar; aqui apenas /personalizado
 */
const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth').requireAuth;
const dashboardPersonalizadoService = require('../services/dashboardPersonalizadoService');

/**
 * GET /dashboard/personalizado
 * Retorna config do dashboard personalizado por perfil (perfil + modulos + layout).
 * Cache 24h por usuário.
 */
router.get('/personalizado', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const config = await dashboardPersonalizadoService.getConfigPersonalizado(user);
    if (!config) return res.status(404).json({ ok: false, error: 'Config não disponível' });
    res.json({ ok: true, ...config });
  } catch (err) {
    console.error('[DASHBOARD_PERSONALIZADO]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /dashboard/invalidar-cache
 * Invalida cache de config do dashboard do usuário (ex.: após mudança de cargo)
 */
router.post('/invalidar-cache', requireAuth, async (req, res) => {
  try {
    await dashboardPersonalizadoService.invalidarCache(req.user.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[DASHBOARD_INVALIDAR]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
