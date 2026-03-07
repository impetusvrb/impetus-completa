/**
 * Alertas PLC - IA 1 (interativa) lê os alertas para exibir no dashboard
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireHierarchy } = require('../middleware/auth');
const { isValidUUID } = require('../utils/security');
const { runCollectorCycle } = require('../services/plcCollector');

/**
 * GET /api/plc-alerts
 * Lista alertas não reconhecidos para a empresa (gestores, supervisores)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const acknowledged = req.query.acknowledged === 'true';

    const r = await db.query(`
      SELECT id, equipment_id, equipment_name, title, message, severity, possible_causes, created_at
      FROM plc_alerts
      WHERE company_id = $1 AND acknowledged = $2
      ORDER BY created_at DESC
      LIMIT $3
    `, [req.user.company_id, acknowledged, limit]);

    res.json({ ok: true, alerts: r.rows || [] });
  } catch (err) {
    if (err.message?.includes('does not exist')) {
      return res.json({ ok: true, alerts: [] });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/plc-alerts/run-collector
 * Dispara ciclo de coleta manualmente (gestores) - deve vir ANTES de /:id
 */
router.post('/run-collector', requireAuth, requireHierarchy(2), async (req, res) => {
  try {
    await runCollectorCycle(req.user.company_id);
    res.json({ ok: true, message: 'Coleta executada' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/plc-alerts/:id/acknowledge
 * Reconhecer alerta (gestor)
 */
router.post('/:id/acknowledge', requireAuth, async (req, res) => {
  try {
    if (!isValidUUID(req.params.id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    await db.query(`
      UPDATE plc_alerts SET acknowledged = true, acknowledged_by = $2, acknowledged_at = now()
      WHERE id = $1 AND company_id = $3
    `, [req.params.id, req.user.id, req.user.company_id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
