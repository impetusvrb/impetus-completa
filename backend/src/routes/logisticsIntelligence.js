/**
 * IMPETUS - Inteligência Logística + Expedição Monitorada
 * Dashboard por cargo, alertas, expedições
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const logisticsIntel = require('../services/logisticsIntelligenceService');
const { requireAuth } = require('../middleware/auth');
const { z } = require('zod');

function canManageLogistics(user) {
  const role = (user.role || '').toLowerCase();
  const h = user.hierarchy_level ?? 5;
  return ['admin', 'diretor', 'gerente', 'coordenador', 'supervisor'].includes(role) || h <= 3;
}

function getCompanyId(req) {
  return req.user?.company_id;
}

const expeditionSchema = z.object({
  order_ref: z.string().max(100).optional(),
  product_ref: z.string().max(100).optional(),
  quantity: z.number().min(0).optional().nullable(),
  weight_kg: z.number().min(0).optional().nullable(),
  vehicle_id: z.string().uuid().optional().nullable(),
  driver_id: z.string().uuid().optional().nullable(),
  route_id: z.string().uuid().optional().nullable(),
  origin_point_id: z.string().uuid().optional().nullable(),
  destination_point_id: z.string().uuid().optional().nullable(),
  status: z.enum(['aguardando_expedicao', 'em_carregamento', 'em_transito', 'entregue', 'atraso_detectado', 'problema_logistico']).optional().default('aguardando_expedicao'),
  departure_at: z.string().datetime().optional().nullable(),
  estimated_arrival_at: z.string().datetime().optional().nullable(),
  actual_arrival_at: z.string().datetime().optional().nullable(),
  notes: z.string().max(1000).optional(),
  metadata: z.record(z.any()).optional().default({})
});

/**
 * GET /api/logistics-intelligence/dashboard
 * Painel filtrado por perfil (Operador/Motorista/Supervisor/Gerente/Diretor/CEO)
 */
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const dashboard = await logisticsIntel.getLogisticsDashboardForUser(companyId, req.user);
    res.json({ ok: true, dashboard });
  } catch (err) {
    console.error('[LOGISTICS_INTEL_DASHBOARD]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao carregar painel' });
  }
});

/**
 * GET /api/logistics-intelligence/alerts
 */
router.get('/alerts', requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const h = req.user.hierarchy_level ?? 5;
    const r = await db.query(`
      SELECT la.*, e.order_ref, v.plate_or_id, r.name as route_name, d.name as driver_name
      FROM logistics_alerts la
      LEFT JOIN logistics_expeditions e ON e.id = la.expedition_id
      LEFT JOIN logistics_vehicles v ON v.id = la.vehicle_id
      LEFT JOIN logistics_routes r ON r.id = la.route_id
      LEFT JOIN logistics_drivers d ON d.id = la.driver_id
      WHERE la.company_id = $1 AND la.acknowledged = false
      AND (la.target_role_level IS NULL OR la.target_role_level >= $2)
      ORDER BY la.created_at DESC
      LIMIT 50
    `, [companyId, h]);
    res.json({ ok: true, alerts: r.rows || [] });
  } catch (err) {
    console.error('[LOGISTICS_INTEL_ALERTS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

/**
 * POST /api/logistics-intelligence/alerts/:id/acknowledge
 */
router.post('/alerts/:id/acknowledge', requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    await db.query(`
      UPDATE logistics_alerts SET acknowledged = true, acknowledged_by = $2, acknowledged_at = now()
      WHERE id = $1 AND company_id = $3
    `, [req.params.id, req.user.id, companyId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[LOGISTICS_INTEL_ALERT_ACK]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

/**
 * GET /api/logistics-intelligence/expeditions
 */
router.get('/expeditions', requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const { status, driver_id, vehicle_id, limit = 50 } = req.query;
    const expeditions = await logisticsIntel.getRecentExpeditions(companyId, {
      limit: parseInt(limit, 10) || 50,
      status: status || undefined,
      driver_id: driver_id || undefined,
      vehicle_id: vehicle_id || undefined
    });
    res.json({ ok: true, data: expeditions });
  } catch (err) {
    console.error('[LOGISTICS_INTEL_EXPEDITIONS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

/**
 * POST /api/logistics-intelligence/expeditions
 * Criar nova expedição
 */
router.post('/expeditions', requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    if (!canManageLogistics(req.user)) return res.status(403).json({ ok: false, error: 'Sem permissão para criar expedição' });

    const parsed = expeditionSchema.parse(req.body);
    const r = await db.query(`
      INSERT INTO logistics_expeditions (company_id, order_ref, product_ref, quantity, weight_kg, vehicle_id, driver_id, route_id,
        origin_point_id, destination_point_id, status, departure_at, estimated_arrival_at, actual_arrival_at, notes, metadata, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::timestamptz, $13::timestamptz, $14::timestamptz, $15, $16, $17)
      RETURNING *
    `, [
      companyId, parsed.order_ref || null, parsed.product_ref || null, parsed.quantity ?? null, parsed.weight_kg ?? null,
      parsed.vehicle_id || null, parsed.driver_id || null, parsed.route_id || null,
      parsed.origin_point_id || null, parsed.destination_point_id || null,
      parsed.status || 'aguardando_expedicao',
      parsed.departure_at || null, parsed.estimated_arrival_at || null, parsed.actual_arrival_at || null,
      parsed.notes || null, JSON.stringify(parsed.metadata || {}), req.user.id
    ]);
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ ok: false, error: err.errors?.[0]?.message || 'Dados inválidos' });
    console.error('[LOGISTICS_INTEL_EXPEDITION_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao criar expedição' });
  }
});

/**
 * PUT /api/logistics-intelligence/expeditions/:id
 * Atualizar status da expedição
 */
router.put('/expeditions/:id', requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });

    const partialSchema = z.object({
      status: z.enum(['aguardando_expedicao', 'em_carregamento', 'em_transito', 'entregue', 'atraso_detectado', 'problema_logistico']).optional(),
      departure_at: z.string().optional().nullable(),
      estimated_arrival_at: z.string().optional().nullable(),
      actual_arrival_at: z.string().optional().nullable(),
      notes: z.string().max(1000).optional()
    });
    const parsed = partialSchema.parse(req.body);

    const sets = [];
    const vals = [];
    let n = 1;
    if (parsed.status !== undefined) { sets.push(`status = $${n}`); vals.push(parsed.status); n++; }
    if (parsed.departure_at !== undefined) { sets.push(`departure_at = $${n}::timestamptz`); vals.push(parsed.departure_at || null); n++; }
    if (parsed.estimated_arrival_at !== undefined) { sets.push(`estimated_arrival_at = $${n}::timestamptz`); vals.push(parsed.estimated_arrival_at || null); n++; }
    if (parsed.actual_arrival_at !== undefined) { sets.push(`actual_arrival_at = $${n}::timestamptz`); vals.push(parsed.actual_arrival_at || null); n++; }
    if (parsed.notes !== undefined) { sets.push(`notes = $${n}`); vals.push(parsed.notes || null); n++; }
    if (sets.length === 0) return res.status(400).json({ ok: false, error: 'Nenhum campo para atualizar' });

    vals.push(req.params.id, companyId);
    const r = await db.query(
      `UPDATE logistics_expeditions SET ${sets.join(', ')}, updated_at = now() WHERE id = $${n} AND company_id = $${n + 1} RETURNING *`,
      vals
    );
    if (!r.rows?.[0]) return res.status(404).json({ ok: false, error: 'Expedição não encontrada' });
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ ok: false, error: err.errors?.[0]?.message || 'Dados inválidos' });
    console.error('[LOGISTICS_INTEL_EXPEDITION_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao atualizar' });
  }
});

/**
 * GET /api/logistics-intelligence/indicators
 */
router.get('/indicators', requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const profile = logisticsIntel.getLogisticsProfileForUser(req.user);
    if (!['gerente', 'diretor', 'ceo', 'supervisor'].includes(profile.level)) {
      return res.status(403).json({ ok: false, error: 'Sem acesso a indicadores' });
    }
    const days = parseInt(req.query.days, 10) || 30;
    const indicators = await logisticsIntel.calculateLogisticsIndicators(companyId, days);
    res.json({ ok: true, indicators });
  } catch (err) {
    console.error('[LOGISTICS_INTEL_INDICATORS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

/**
 * GET /api/logistics-intelligence/predictions
 */
router.get('/predictions', requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const profile = logisticsIntel.getLogisticsProfileForUser(req.user);
    if (!profile.receives.some(x => ['demand_forecast', 'strategic_cost', 'transport_efficiency', 'fleet_efficiency'].includes(x))) {
      return res.status(403).json({ ok: false, error: 'Sem acesso a previsões' });
    }
    const predictions = await logisticsIntel.predictLogisticsDemand(companyId);
    res.json({ ok: true, predictions });
  } catch (err) {
    console.error('[LOGISTICS_INTEL_PREDICTIONS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

/**
 * POST /api/logistics-intelligence/run-alerts
 * Executa detecção de alertas (supervisor+)
 */
router.post('/run-alerts', requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    if (!canManageLogistics(req.user)) return res.status(403).json({ ok: false, error: 'Sem permissão' });
    const alerts = await logisticsIntel.detectAndCreateLogisticsAlerts(companyId);
    res.json({ ok: true, alerts_created: alerts.length });
  } catch (err) {
    console.error('[LOGISTICS_INTEL_RUN_ALERTS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

module.exports = router;
