/**
 * IMPETUS - Rotas do Dashboard de Manutenção
 * GET /summary, /cards, /my-tasks, /machines-attention, /interventions, /preventives, /recurring-failures
 * Montar em: app.use('/api/dashboard/maintenance', dashboardMaintenanceRouter)
 */
const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth').requireAuth;
const maintenanceService = require('../services/dashboardMaintenanceService');

function handle(handler) {
  return async (req, res) => {
    try {
      const data = await handler(req.user);
      res.json({ ok: true, ...data });
    } catch (err) {
      console.warn('[DASHBOARD_MAINTENANCE]', err?.message || err);
      res.status(500).json({ ok: false, error: err?.message || 'Erro ao carregar dados' });
    }
  };
}

router.get('/summary', requireAuth, handle(maintenanceService.getSummary));
router.get('/cards', requireAuth, handle(maintenanceService.getCards));
router.get('/my-tasks', requireAuth, handle(maintenanceService.getMyTasks));
router.get('/machines-attention', requireAuth, handle(maintenanceService.getMachinesAttention));
router.get('/interventions', requireAuth, handle(maintenanceService.getInterventions));
router.get('/preventives', requireAuth, handle(maintenanceService.getPreventives));
router.get('/recurring-failures', requireAuth, handle(maintenanceService.getRecurringFailures));

module.exports = router;
