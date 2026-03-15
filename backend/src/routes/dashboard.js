/**
 * ROTAS DE DASHBOARD - Layout dinâmico por perfil
 * GET /api/dashboard/dynamic-layout - retorna widgets baseado em cargo/departamento/hierarquia
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

function safeRequire(path) {
  try {
    return require(path);
  } catch (e) {
    return null;
  }
}

const dynamicDashboard = safeRequire('../services/dynamicDashboardService');

router.get('/dynamic-layout', requireAuth, (req, res) => {
  try {
    if (!dynamicDashboard) {
      return res.status(503).json({
        ok: false,
        error: 'Serviço de dashboard dinâmico não disponível',
        widgets: [],
        layout: {},
        alerts: [],
        userProfile: {}
      });
    }
    const layout = dynamicDashboard.getDynamicLayout(req.user);
    res.json({ ok: true, ...layout });
  } catch (err) {
    console.error('[DASHBOARD_DYNAMIC_LAYOUT_ERROR]', err);
    res.status(500).json({ ok: false, error: 'Erro ao gerar layout dinâmico' });
  }
});

module.exports = router;
