/**
 * ADMIN - Logística Inteligente + Expedição Monitorada
 * Cadastro: Veículos, Rotas, Pontos, Motoristas
 * Apenas administradores (hierarchy <= 1)
 */
const express = require('express');
const router = express.Router();
const db = require('../../db');
const { requireAuth, requireHierarchy } = require('../../middleware/auth');
const { z } = require('zod');

const adminMw = [requireAuth, requireHierarchy(1)];

function getCompanyId(req) {
  return req.user?.company_id;
}

const VEHICLE_TYPES = ['caminhao', 'van', 'empilhadeira', 'drone_logistico', 'carreta', 'utilitario'];
const POINT_TYPES = ['doca', 'armazem', 'centro_distribuicao', 'estoque_intermediario', 'cliente', 'outro'];
const DRIVER_ROLES = ['motorista', 'operador_empilhadeira', 'operador_carga', 'supervisor_logistica', 'outro'];
const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];

const vehicleSchema = z.object({
  vehicle_type: z.enum(VEHICLE_TYPES),
  plate_or_id: z.string().min(1).max(50),
  capacity_kg: z.number().min(0).optional().nullable(),
  capacity_m3: z.number().min(0).optional().nullable(),
  allowed_cargo_types: z.array(z.string()).optional().default([]),
  avg_consumption: z.number().min(0).optional().nullable(),
  consumption_unit: z.string().max(20).optional().default('km/l'),
  status: z.enum(['available', 'in_use', 'maintenance', 'inactive']).optional().default('available'),
  scheduled_maintenance: z.string().optional().nullable(),
  odometer_km: z.number().min(0).optional().default(0),
  assigned_driver_id: z.string().uuid().optional().nullable(),
  driver_name: z.string().max(200).optional().nullable(),
  has_telemetry: z.boolean().optional().default(false),
  telemetry_device_id: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional(),
  active: z.boolean().optional().default(true)
});

const routeSchema = z.object({
  name: z.string().min(1).max(200),
  origin_point_id: z.string().uuid().optional().nullable(),
  destination_point_id: z.string().uuid().optional().nullable(),
  origin_description: z.string().max(500).optional().nullable(),
  destination_description: z.string().max(500).optional().nullable(),
  distance_km: z.number().min(0).optional().nullable(),
  avg_duration_minutes: z.number().int().min(0).optional().nullable(),
  logistic_risk_level: z.enum(RISK_LEVELS).optional().nullable(),
  stop_points: z.array(z.any()).optional().default([]),
  critical_points: z.array(z.any()).optional().default([]),
  alternative_routes: z.array(z.any()).optional().default([]),
  active: z.boolean().optional().default(true)
});

const pointSchema = z.object({
  point_type: z.enum(POINT_TYPES),
  name: z.string().min(1).max(200),
  code: z.string().max(64).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  capacity_kg: z.number().min(0).optional().nullable(),
  capacity_m3: z.number().min(0).optional().nullable(),
  avg_operation_time_minutes: z.number().int().min(0).optional().nullable(),
  responsible_ids: z.array(z.string().uuid()).optional().default([]),
  operating_hours: z.string().max(200).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  active: z.boolean().optional().default(true)
});

const driverSchema = z.object({
  name: z.string().min(1).max(200),
  user_id: z.string().uuid().optional().nullable(),
  role_type: z.enum(DRIVER_ROLES),
  license_number: z.string().max(100).optional().nullable(),
  license_category: z.string().max(20).optional().nullable(),
  trainings: z.array(z.string()).optional().default([]),
  performance_score: z.number().min(0).max(100).optional().nullable(),
  occurrence_count: z.number().int().min(0).optional().default(0),
  notes: z.string().max(1000).optional(),
  active: z.boolean().optional().default(true)
});

// ============================================================================
// 1. VEÍCULOS E FROTA
// ============================================================================

router.get('/vehicles', ...adminMw, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT v.*, d.name as driver_name_resolved
      FROM logistics_vehicles v
      LEFT JOIN logistics_drivers d ON d.id = v.assigned_driver_id
      WHERE v.company_id = $1
      ORDER BY v.plate_or_id
    `, [getCompanyId(req)]);
    res.json({ ok: true, data: r.rows || [] });
  } catch (err) {
    console.error('[LOGISTICS_VEHICLES_LIST]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao listar' });
  }
});

router.post('/vehicles', ...adminMw, async (req, res) => {
  try {
    const parsed = vehicleSchema.parse(req.body);
    const r = await db.query(`
      INSERT INTO logistics_vehicles (company_id, vehicle_type, plate_or_id, capacity_kg, capacity_m3, allowed_cargo_types,
        avg_consumption, consumption_unit, status, scheduled_maintenance, odometer_km, assigned_driver_id, driver_name,
        has_telemetry, telemetry_device_id, notes, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::date, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      getCompanyId(req), parsed.vehicle_type, parsed.plate_or_id,
      parsed.capacity_kg ?? null, parsed.capacity_m3 ?? null, parsed.allowed_cargo_types || [],
      parsed.avg_consumption ?? null, parsed.consumption_unit || 'km/l',
      parsed.status || 'available', parsed.scheduled_maintenance || null, parsed.odometer_km ?? 0,
      parsed.assigned_driver_id || null, parsed.driver_name || null,
      parsed.has_telemetry ?? false, parsed.telemetry_device_id || null, parsed.notes || null, parsed.active !== false
    ]);
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ ok: false, error: err.errors?.[0]?.message || 'Dados inválidos' });
    if (err.code === '23505') return res.status(409).json({ ok: false, error: 'Placa/identificação já existe' });
    console.error('[LOGISTICS_VEHICLE_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao cadastrar' });
  }
});

router.put('/vehicles/:id', ...adminMw, async (req, res) => {
  try {
    const parsed = vehicleSchema.parse(req.body);
    const r = await db.query(`
      UPDATE logistics_vehicles SET
        vehicle_type = $2, plate_or_id = $3, capacity_kg = $4, capacity_m3 = $5, allowed_cargo_types = $6,
        avg_consumption = $7, consumption_unit = $8, status = $9, scheduled_maintenance = $10::date, odometer_km = $11,
        assigned_driver_id = $12, driver_name = $13, has_telemetry = $14, telemetry_device_id = $15, notes = $16, active = $17, updated_at = now()
      WHERE id = $1 AND company_id = $18
      RETURNING *
    `, [
      req.params.id, parsed.vehicle_type, parsed.plate_or_id,
      parsed.capacity_kg ?? null, parsed.capacity_m3 ?? null, parsed.allowed_cargo_types || [],
      parsed.avg_consumption ?? null, parsed.consumption_unit || 'km/l', parsed.status || 'available',
      parsed.scheduled_maintenance || null, parsed.odometer_km ?? 0,
      parsed.assigned_driver_id || null, parsed.driver_name || null,
      parsed.has_telemetry ?? false, parsed.telemetry_device_id || null, parsed.notes || null, parsed.active !== false,
      getCompanyId(req)
    ]);
    if (!r.rows?.[0]) return res.status(404).json({ ok: false, error: 'Veículo não encontrado' });
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ ok: false, error: err.errors?.[0]?.message || 'Dados inválidos' });
    if (err.code === '23505') return res.status(409).json({ ok: false, error: 'Placa já existe' });
    console.error('[LOGISTICS_VEHICLE_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao atualizar' });
  }
});

router.delete('/vehicles/:id', ...adminMw, async (req, res) => {
  try {
    const r = await db.query(`
      UPDATE logistics_vehicles SET active = false, updated_at = now()
      WHERE id = $1 AND company_id = $2 RETURNING id
    `, [req.params.id, getCompanyId(req)]);
    if (!r.rows?.[0]) return res.status(404).json({ ok: false, error: 'Veículo não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[LOGISTICS_VEHICLE_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao excluir' });
  }
});

// ============================================================================
// 2. PONTOS LOGÍSTICOS
// ============================================================================

router.get('/points', ...adminMw, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT * FROM logistics_points WHERE company_id = $1 ORDER BY point_type, name
    `, [getCompanyId(req)]);
    res.json({ ok: true, data: r.rows || [] });
  } catch (err) {
    console.error('[LOGISTICS_POINTS_LIST]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao listar' });
  }
});

router.post('/points', ...adminMw, async (req, res) => {
  try {
    const parsed = pointSchema.parse(req.body);
    const r = await db.query(`
      INSERT INTO logistics_points (company_id, point_type, name, code, address, capacity_kg, capacity_m3,
        avg_operation_time_minutes, responsible_ids, operating_hours, latitude, longitude, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      getCompanyId(req), parsed.point_type, parsed.name, parsed.code || null, parsed.address || null,
      parsed.capacity_kg ?? null, parsed.capacity_m3 ?? null, parsed.avg_operation_time_minutes ?? null,
      parsed.responsible_ids || [], parsed.operating_hours || null,
      parsed.latitude ?? null, parsed.longitude ?? null, parsed.active !== false
    ]);
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ ok: false, error: err.errors?.[0]?.message || 'Dados inválidos' });
    console.error('[LOGISTICS_POINT_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao cadastrar' });
  }
});

router.put('/points/:id', ...adminMw, async (req, res) => {
  try {
    const parsed = pointSchema.parse(req.body);
    const r = await db.query(`
      UPDATE logistics_points SET
        point_type = $2, name = $3, code = $4, address = $5, capacity_kg = $6, capacity_m3 = $7,
        avg_operation_time_minutes = $8, responsible_ids = $9, operating_hours = $10, latitude = $11, longitude = $12, active = $13, updated_at = now()
      WHERE id = $1 AND company_id = $14
      RETURNING *
    `, [
      req.params.id, parsed.point_type, parsed.name, parsed.code || null, parsed.address || null,
      parsed.capacity_kg ?? null, parsed.capacity_m3 ?? null, parsed.avg_operation_time_minutes ?? null,
      parsed.responsible_ids || [], parsed.operating_hours || null, parsed.latitude ?? null, parsed.longitude ?? null, parsed.active !== false,
      getCompanyId(req)
    ]);
    if (!r.rows?.[0]) return res.status(404).json({ ok: false, error: 'Ponto não encontrado' });
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ ok: false, error: err.errors?.[0]?.message || 'Dados inválidos' });
    console.error('[LOGISTICS_POINT_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao atualizar' });
  }
});

router.delete('/points/:id', ...adminMw, async (req, res) => {
  try {
    const r = await db.query(`
      UPDATE logistics_points SET active = false, updated_at = now()
      WHERE id = $1 AND company_id = $2 RETURNING id
    `, [req.params.id, getCompanyId(req)]);
    if (!r.rows?.[0]) return res.status(404).json({ ok: false, error: 'Ponto não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[LOGISTICS_POINT_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao excluir' });
  }
});

// ============================================================================
// 3. ROTAS LOGÍSTICAS
// ============================================================================

router.get('/routes', ...adminMw, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT r.*, o.name as origin_name, d.name as destination_name
      FROM logistics_routes r
      LEFT JOIN logistics_points o ON o.id = r.origin_point_id
      LEFT JOIN logistics_points d ON d.id = r.destination_point_id
      WHERE r.company_id = $1
      ORDER BY r.name
    `, [getCompanyId(req)]);
    res.json({ ok: true, data: r.rows || [] });
  } catch (err) {
    console.error('[LOGISTICS_ROUTES_LIST]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao listar' });
  }
});

router.post('/routes', ...adminMw, async (req, res) => {
  try {
    const parsed = routeSchema.parse(req.body);
    const r = await db.query(`
      INSERT INTO logistics_routes (company_id, name, origin_point_id, destination_point_id, origin_description, destination_description,
        distance_km, avg_duration_minutes, logistic_risk_level, stop_points, critical_points, alternative_routes, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      getCompanyId(req), parsed.name, parsed.origin_point_id || null, parsed.destination_point_id || null,
      parsed.origin_description || null, parsed.destination_description || null,
      parsed.distance_km ?? null, parsed.avg_duration_minutes ?? null, parsed.logistic_risk_level || null,
      JSON.stringify(parsed.stop_points || []), JSON.stringify(parsed.critical_points || []), JSON.stringify(parsed.alternative_routes || []),
      parsed.active !== false
    ]);
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ ok: false, error: err.errors?.[0]?.message || 'Dados inválidos' });
    console.error('[LOGISTICS_ROUTE_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao cadastrar' });
  }
});

router.put('/routes/:id', ...adminMw, async (req, res) => {
  try {
    const parsed = routeSchema.parse(req.body);
    const r = await db.query(`
      UPDATE logistics_routes SET
        name = $2, origin_point_id = $3, destination_point_id = $4, origin_description = $5, destination_description = $6,
        distance_km = $7, avg_duration_minutes = $8, logistic_risk_level = $9, stop_points = $10, critical_points = $11, alternative_routes = $12, active = $13, updated_at = now()
      WHERE id = $1 AND company_id = $14
      RETURNING *
    `, [
      req.params.id, parsed.name, parsed.origin_point_id || null, parsed.destination_point_id || null,
      parsed.origin_description || null, parsed.destination_description || null,
      parsed.distance_km ?? null, parsed.avg_duration_minutes ?? null, parsed.logistic_risk_level || null,
      JSON.stringify(parsed.stop_points || []), JSON.stringify(parsed.critical_points || []), JSON.stringify(parsed.alternative_routes || []),
      parsed.active !== false, getCompanyId(req)
    ]);
    if (!r.rows?.[0]) return res.status(404).json({ ok: false, error: 'Rota não encontrada' });
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ ok: false, error: err.errors?.[0]?.message || 'Dados inválidos' });
    console.error('[LOGISTICS_ROUTE_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao atualizar' });
  }
});

router.delete('/routes/:id', ...adminMw, async (req, res) => {
  try {
    const r = await db.query(`
      UPDATE logistics_routes SET active = false, updated_at = now()
      WHERE id = $1 AND company_id = $2 RETURNING id
    `, [req.params.id, getCompanyId(req)]);
    if (!r.rows?.[0]) return res.status(404).json({ ok: false, error: 'Rota não encontrada' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[LOGISTICS_ROUTE_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao excluir' });
  }
});

// ============================================================================
// 4. MOTORISTAS E OPERADORES
// ============================================================================

router.get('/drivers', ...adminMw, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT d.*, u.name as user_name
      FROM logistics_drivers d
      LEFT JOIN users u ON u.id = d.user_id
      WHERE d.company_id = $1
      ORDER BY d.name
    `, [getCompanyId(req)]);
    res.json({ ok: true, data: r.rows || [] });
  } catch (err) {
    console.error('[LOGISTICS_DRIVERS_LIST]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao listar' });
  }
});

router.post('/drivers', ...adminMw, async (req, res) => {
  try {
    const parsed = driverSchema.parse(req.body);
    const r = await db.query(`
      INSERT INTO logistics_drivers (company_id, name, user_id, role_type, license_number, license_category, trainings, performance_score, occurrence_count, notes, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      getCompanyId(req), parsed.name, parsed.user_id || null, parsed.role_type,
      parsed.license_number || null, parsed.license_category || null, parsed.trainings || [], parsed.performance_score ?? null, parsed.occurrence_count ?? 0,
      parsed.notes || null, parsed.active !== false
    ]);
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ ok: false, error: err.errors?.[0]?.message || 'Dados inválidos' });
    console.error('[LOGISTICS_DRIVER_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao cadastrar' });
  }
});

router.put('/drivers/:id', ...adminMw, async (req, res) => {
  try {
    const parsed = driverSchema.parse(req.body);
    const r = await db.query(`
      UPDATE logistics_drivers SET
        name = $2, user_id = $3, role_type = $4, license_number = $5, license_category = $6,
        trainings = $7, performance_score = $8, occurrence_count = $9, notes = $10, active = $11, updated_at = now()
      WHERE id = $1 AND company_id = $12
      RETURNING *
    `, [
      req.params.id, parsed.name, parsed.user_id || null, parsed.role_type,
      parsed.license_number || null, parsed.license_category || null, parsed.trainings || [],
      parsed.performance_score ?? null, parsed.occurrence_count ?? 0, parsed.notes || null, parsed.active !== false,
      getCompanyId(req)
    ]);
    if (!r.rows?.[0]) return res.status(404).json({ ok: false, error: 'Motorista não encontrado' });
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ ok: false, error: err.errors?.[0]?.message || 'Dados inválidos' });
    console.error('[LOGISTICS_DRIVER_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao atualizar' });
  }
});

router.delete('/drivers/:id', ...adminMw, async (req, res) => {
  try {
    const r = await db.query(`
      UPDATE logistics_drivers SET active = false, updated_at = now()
      WHERE id = $1 AND company_id = $2 RETURNING id
    `, [req.params.id, getCompanyId(req)]);
    if (!r.rows?.[0]) return res.status(404).json({ ok: false, error: 'Motorista não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[LOGISTICS_DRIVER_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao excluir' });
  }
});

module.exports = router;
