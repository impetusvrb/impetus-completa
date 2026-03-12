/**
 * IMPETUS - Inteligência de Almoxarifado
 * Dashboard por cargo, alertas, previsões, materiais parados
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const warehouseIntel = require('../services/warehouseIntelligenceService');
const { requireAuth } = require('../middleware/auth');

function canManageWarehouse(user) {
  const role = (user.role || '').toLowerCase();
  const h = user.hierarchy_level ?? 5;
  return ['admin', 'diretor', 'gerente', 'coordenador'].includes(role) || h <= 2;
}

/**
 * GET /api/warehouse-intelligence/dashboard
 * Painel filtrado por perfil (Operador/Supervisor/Gerente/Diretor/CEO)
 */
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const dashboard = await warehouseIntel.getWarehouseDashboardForUser(companyId, req.user);
    res.json({ ok: true, dashboard });
  } catch (err) {
    console.error('[WAREHOUSE_INTEL_DASHBOARD]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao carregar painel' });
  }
});

/**
 * GET /api/warehouse-intelligence/alerts
 */
router.get('/alerts', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const h = req.user.hierarchy_level ?? 5;
    const r = await db.query(`
      SELECT wa.*, m.name as material_name, m.code as material_code
      FROM warehouse_alerts wa
      LEFT JOIN warehouse_materials m ON m.id = wa.material_id
      WHERE wa.company_id = $1 AND wa.acknowledged = false
      AND (wa.target_role_level IS NULL OR wa.target_role_level >= $2)
      ORDER BY wa.created_at DESC
      LIMIT 50
    `, [companyId, h]);
    res.json({ ok: true, alerts: r.rows || [] });
  } catch (err) {
    console.error('[WAREHOUSE_INTEL_ALERTS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

/**
 * POST /api/warehouse-intelligence/alerts/:id/acknowledge
 */
router.post('/alerts/:id/acknowledge', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    await db.query(`
      UPDATE warehouse_alerts SET acknowledged = true, acknowledged_by = $2, acknowledged_at = now()
      WHERE id = $1 AND company_id = $3
    `, [req.params.id, req.user.id, companyId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[WAREHOUSE_INTEL_ALERT_ACK]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

/**
 * GET /api/warehouse-intelligence/predictions
 * Previsões de necessidade de materiais
 */
router.get('/predictions', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const profile = warehouseIntel.getWarehouseProfileForUser(req.user);
    if (!profile.receives.some((x) => ['predictions', 'purchase_forecast', 'strategic_analysis'].includes(x))) {
      return res.status(403).json({ ok: false, error: 'Sem acesso a previsões' });
    }
    const predictions = await warehouseIntel.predictMaterialNeeds(companyId);
    res.json({ ok: true, predictions });
  } catch (err) {
    console.error('[WAREHOUSE_INTEL_PREDICTIONS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

/**
 * GET /api/warehouse-intelligence/idle-materials
 * Materiais parados ou obsoletos
 */
router.get('/idle-materials', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const profile = warehouseIntel.getWarehouseProfileForUser(req.user);
    if (!profile.receives.includes('idle_materials')) {
      return res.status(403).json({ ok: false, error: 'Sem acesso' });
    }
    const days = parseInt(req.query.days, 10) || 60;
    const idle = await warehouseIntel.detectIdleMaterials(companyId, days);
    res.json({ ok: true, materials: idle });
  } catch (err) {
    console.error('[WAREHOUSE_INTEL_IDLE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

/**
 * GET /api/warehouse-intelligence/indicators
 */
router.get('/indicators', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const profile = warehouseIntel.getWarehouseProfileForUser(req.user);
    if (!['gerente', 'diretor', 'ceo', 'supervisor'].includes(profile.level)) {
      return res.status(403).json({ ok: false, error: 'Sem acesso a indicadores' });
    }
    const days = parseInt(req.query.days, 10) || 30;
    const indicators = await warehouseIntel.calculateWarehouseIndicators(companyId, days);
    res.json({ ok: true, indicators });
  } catch (err) {
    console.error('[WAREHOUSE_INTEL_INDICATORS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

/**
 * GET /api/warehouse-intelligence/impact/forecasting
 */
router.get('/impact/forecasting', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const profile = warehouseIntel.getWarehouseProfileForUser(req.user);
    if (!['gerente', 'diretor', 'ceo'].includes(profile.level)) {
      return res.status(403).json({ ok: false, error: 'Sem acesso' });
    }
    const impact = await warehouseIntel.getWarehouseImpactForForecasting(companyId);
    res.json({ ok: true, impact });
  } catch (err) {
    console.error('[WAREHOUSE_INTEL_IMPACT]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

/**
 * POST /api/warehouse-intelligence/run-alerts
 * Executa detecção de alertas (gerente+)
 */
router.post('/run-alerts', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    if (!canManageWarehouse(req.user)) return res.status(403).json({ ok: false, error: 'Sem permissão' });
    const alerts = await warehouseIntel.detectAndCreateWarehouseAlerts(companyId);
    await warehouseIntel.savePredictionsSnapshot(companyId);
    res.json({ ok: true, alerts_created: alerts.length });
  } catch (err) {
    console.error('[WAREHOUSE_INTEL_RUN_ALERTS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

module.exports = router;
