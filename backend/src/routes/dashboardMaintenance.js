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
router.get('/preventives-board', requireAuth, handle(maintenanceService.getPreventivesBoard));
router.get('/recurring-failures', requireAuth, handle(maintenanceService.getRecurringFailures));

/** POST /preventives — registo industrial de preventiva (CERT / piloto TPM) */
router.post('/preventives', requireAuth, async (req, res) => {
  try {
    const data = await maintenanceService.createPreventive(req.user, req.body || {});
    if (data.error) return res.status(data.status || 400).json({ ok: false, error: data.error });
    res.status(201).json({ ok: true, ...data });
  } catch (err) {
    console.warn('[DASHBOARD_MAINTENANCE_CREATE_PREVENTIVE]', err?.message || err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro' });
  }
});

/** PATCH /preventives/:id — concluir preventiva */
router.patch('/preventives/:id', requireAuth, async (req, res) => {
  try {
    const data = await maintenanceService.completePreventive(req.user, req.params.id, req.body || {});
    if (data.error) return res.status(data.status || 400).json({ ok: false, error: data.error });
    res.json({ ok: true, ...data });
  } catch (err) {
    console.warn('[DASHBOARD_MAINTENANCE_COMPLETE_PREVENTIVE]', err?.message || err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro' });
  }
});

module.exports = router;
