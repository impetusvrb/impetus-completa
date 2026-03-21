/**
 * IMPETUS - Rotas do dashboard (perfil, módulos visíveis, layout personalizado)
 */
const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth').requireAuth;
const dashboardPersonalizadoService = require('../services/dashboardPersonalizadoService');
const dashboardMaintenanceRouter = require('./dashboardMaintenance');
const dashboardProfileResolver = require('../services/dashboardProfileResolver');
const dashboardAccessService = require('../services/dashboardAccessService');
const dashboardVisibility = require('../services/dashboardVisibility');
const dashboardKPIs = require('../services/dashboardKPIs');
const userContext = require('../services/userContext');
const hierarchicalFilter = require('../services/hierarchicalFilter');

router.use('/maintenance', dashboardMaintenanceRouter);

/**
 * GET /dashboard/me
 * Payload completo: perfil, visible_modules, user_context, sections, kpis.
 * Usado por useDashboardMe, useVisibleModules e Dashboard Inteligente.
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const config = dashboardProfileResolver.getDashboardConfigForUser(user);
    const profileConfig = config.profile_config || {};
    const allowedModules = dashboardAccessService.getAllowedModules(user);
    const hierarchyLevel = user.hierarchy_level ?? userContext.buildUserContext(user)?.hierarchy_level ?? 5;
    const scope = await hierarchicalFilter.resolveHierarchyScope(user);

    const [sections, kpis] = await Promise.all([
      dashboardVisibility.getVisibilityForUser(hierarchyLevel, user.company_id),
      dashboardKPIs.getDashboardKPIs(user, scope).catch(() => [])
    ]);

    res.json({
      profile_code: config.profile_code,
      profile_label: profileConfig.label || config.profile_code,
      profile_config: profileConfig,
      visible_modules: allowedModules.length ? allowedModules : (profileConfig.visible_modules || []),
      user_context: userContext.buildUserContext(user),
      sections,
      kpis,
      functional_area: config.functional_area
    });
  } catch (err) {
    console.error('[DASHBOARD_ME]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao carregar perfil' });
  }
});

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
