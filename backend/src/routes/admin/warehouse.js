/**
 * ADMIN - Estrutura de Cadastros do Almoxarifado Inteligente
 * Apenas administradores (hierarchy <= 1)
 * Categorias, Materiais, Fornecedores, Localizações, Parâmetros, Vínculos
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

// Schemas Zod
const categorySchema = z.object({
  name: z.string().min(2).max(200),
  code: z.string().max(64).optional(),
  description: z.string().max(500).optional(),
  active: z.boolean().optional()
});

const supplierSchema = z.object({
  name: z.string().min(2).max(200),
  cnpj: z.string().max(18).optional(),
  material_types_supplied: z.array(z.string()).optional(),
  commercial_contact: z.string().max(200).optional(),
  contact_email: z.string().email().max(200).optional().nullable(),
  contact_phone: z.string().max(50).optional(),
  avg_delivery_days: z.number().int().min(0).optional().nullable(),
  notes: z.string().max(1000).optional(),
  active: z.boolean().optional()
});

const locationSchema = z.object({
  warehouse_sector: z.string().min(1).max(100),
  aisle_area: z.string().max(100).optional(),
  shelf_position: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  active: z.boolean().optional()
});

const materialSchema = z.object({
  name: z.string().min(2).max(200),
  code: z.string().min(1).max(64),
  category_id: z.string().uuid().optional().nullable(),
  default_supplier_id: z.string().uuid().optional().nullable(),
  unit: z.string().min(1).max(20),
  technical_description: z.string().max(2000).optional(),
  min_stock: z.number().min(0).optional(),
  ideal_stock: z.number().min(0).optional(),
  usage_type: z.enum(['production', 'maintenance', 'general']).optional(),
  default_location_id: z.string().uuid().optional().nullable(),
  active: z.boolean().optional()
});

const paramsSchema = z.object({
  min_safety_stock_pct: z.number().min(0).max(100).optional(),
  critical_level_pct: z.number().min(0).max(100).optional(),
  replenishment_alert_days: z.number().int().min(0).optional(),
  consumption_analysis_frequency: z.enum(['hourly', 'daily', 'weekly', 'monthly']).optional()
});

const movementSchema = z.object({
  material_id: z.string().uuid(),
  movement_type: z.enum(['entrada', 'saida', 'consumo_producao', 'consumo_manutencao', 'ajuste']),
  quantity: z.number().positive(),
  location_id: z.string().uuid().optional().nullable(),
  reference_type: z.string().max(50).optional(),
  reference_id: z.string().max(100).optional(),
  work_order_id: z.string().uuid().optional().nullable(),
  process_id: z.string().uuid().optional().nullable(),
  production_line_id: z.string().uuid().optional().nullable(),
  asset_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(500).optional(),
  document_ref: z.string().max(100).optional()
});

const linkSchema = z.object({
  material_id: z.string().uuid(),
  link_type: z.enum(['production', 'maintenance', 'service_order', 'operational']),
  process_id: z.string().uuid().optional().nullable(),
  production_line_id: z.string().uuid().optional().nullable(),
  asset_id: z.string().uuid().optional().nullable(),
  department_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(500).optional()
});

// ============================================================================
// 1. CATEGORIAS DE MATERIAIS
// ============================================================================

router.get('/categories', ...adminMw, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT * FROM warehouse_material_categories WHERE company_id = $1 ORDER BY name
    `, [getCompanyId(req)]);
    res.json({ ok: true, data: r.rows || [] });
  } catch (err) {
    console.error('[WAREHOUSE_CATEGORIES_LIST]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao listar' });
  }
});

router.post('/categories', ...adminMw, async (req, res) => {
  try {
    const parsed = categorySchema.parse(req.body);
    const r = await db.query(`
      INSERT INTO warehouse_material_categories (company_id, name, code, description, active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [getCompanyId(req), parsed.name, parsed.code || null, parsed.description || null, parsed.active !== false]);
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ ok: false, error: err.errors?.[0]?.message || 'Dados inválidos' });
    if (err.code === '23505') return res.status(409).json({ ok: false, error: 'Código já existe' });
    console.error('[WAREHOUSE_CATEGORY_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao cadastrar' });
  }
});

router.put('/categories/:id', ...adminMw, async (req, res) => {
  try {
    const parsed = categorySchema.parse(req.body);
    const r = await db.query(`
      UPDATE warehouse_material_categories SET
        name = $2, code = $3, description = $4, active = $5, updated_at = now()
      WHERE id = $1 AND company_id = $6
      RETURNING *
    `, [req.params.id, parsed.name, parsed.code || null, parsed.description || null, parsed.active !== false, getCompanyId(req)]);
    if (!r.rows?.[0]) return res.status(404).json({ ok: false, error: 'Categoria não encontrada' });
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ ok: false, error: err.errors?.[0]?.message || 'Dados inválidos' });
    if (err.code === '23505') return res.status(409).json({ ok: false, error: 'Código já existe' });
    console.error('[WAREHOUSE_CATEGORY_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao atualizar' });
  }
});

router.delete('/categories/:id', ...adminMw, async (req, res) => {
  try {
    const r = await db.query(`
      UPDATE warehouse_material_categories SET active = false, updated_at = now()
      WHERE id = $1 AND company_id = $2 RETURNING id
    `, [req.params.id, getCompanyId(req)]);
    if (!r.rows?.[0]) return res.status(404).json({ ok: false, error: 'Categoria não encontrada' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[WAREHOUSE_CATEGORY_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao excluir' });
  }
});

// ============================================================================
// 2. FORNECEDORES
// ============================================================================

router.get('/suppliers', ...adminMw, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT * FROM warehouse_suppliers WHERE company_id = $1 ORDER BY name
    `, [getCompanyId(req)]);
    res.json({ ok: true, data: r.rows || [] });
  } catch (err) {
    console.error('[WAREHOUSE_SUPPLIERS_LIST]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao listar' });
  }
});

router.post('/suppliers', ...adminMw, async (req, res) => {
  try {
    const parsed = supplierSchema.parse(req.body);
    const r = await db.query(`
      INSERT INTO warehouse_suppliers (company_id, name, cnpj, material_types_supplied, commercial_contact, contact_email, contact_phone, avg_delivery_days, notes, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      getCompanyId(req), parsed.name, parsed.cnpj || null,
      parsed.material_types_supplied || [], parsed.commercial_contact || null,
      parsed.contact_email || null, parsed.contact_phone || null,
      parsed.avg_delivery_days ?? null, parsed.notes || null,
      parsed.active !== false
    ]);
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ ok: false, error: err.errors?.[0]?.message || 'Dados inválidos' });
    console.error('[WAREHOUSE_SUPPLIER_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao cadastrar' });
  }
});

router.put('/suppliers/:id', ...adminMw, async (req, res) => {
  try {
    const parsed = supplierSchema.parse(req.body);
    const r = await db.query(`
      UPDATE warehouse_suppliers SET
        name = $2, cnpj = $3, material_types_supplied = $4, commercial_contact = $5,
        contact_email = $6, contact_phone = $7, avg_delivery_days = $8, notes = $9, active = $10, updated_at = now()
      WHERE id = $1 AND company_id = $11
      RETURNING *
    `, [
      req.params.id, parsed.name, parsed.cnpj || null, parsed.material_types_supplied || [],
      parsed.commercial_contact || null, parsed.contact_email || null, parsed.contact_phone || null,
      parsed.avg_delivery_days ?? null, parsed.notes || null, parsed.active !== false, getCompanyId(req)
    ]);
    if (!r.rows?.[0]) return res.status(404).json({ ok: false, error: 'Fornecedor não encontrado' });
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ ok: false, error: err.errors?.[0]?.message || 'Dados inválidos' });
    console.error('[WAREHOUSE_SUPPLIER_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao atualizar' });
  }
});

router.delete('/suppliers/:id', ...adminMw, async (req, res) => {
  try {
    const r = await db.query(`
      UPDATE warehouse_suppliers SET active = false, updated_at = now()
      WHERE id = $1 AND company_id = $2 RETURNING id
    `, [req.params.id, getCompanyId(req)]);
    if (!r.rows?.[0]) return res.status(404).json({ ok: false, error: 'Fornecedor não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[WAREHOUSE_SUPPLIER_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao excluir' });
  }
});

// ============================================================================
// 3. LOCALIZAÇÕES DE ESTOQUE
// ============================================================================

router.get('/locations', ...adminMw, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT * FROM warehouse_locations WHERE company_id = $1 ORDER BY warehouse_sector, aisle_area, shelf_position
    `, [getCompanyId(req)]);
    res.json({ ok: true, data: r.rows || [] });
  } catch (err) {
    console.error('[WAREHOUSE_LOCATIONS_LIST]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao listar' });
  }
});

router.post('/locations', ...adminMw, async (req, res) => {
  try {
    const parsed = locationSchema.parse(req.body);
    const r = await db.query(`
      INSERT INTO warehouse_locations (company_id, warehouse_sector, aisle_area, shelf_position, description, active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [getCompanyId(req), parsed.warehouse_sector, parsed.aisle_area || null, parsed.shelf_position || null, parsed.description || null, parsed.active !== false]);
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ ok: false, error: err.errors?.[0]?.message || 'Dados inválidos' });
    console.error('[WAREHOUSE_LOCATION_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao cadastrar' });
  }
});

router.put('/locations/:id', ...adminMw, async (req, res) => {
  try {
    const parsed = locationSchema.parse(req.body);
    const r = await db.query(`
      UPDATE warehouse_locations SET
        warehouse_sector = $2, aisle_area = $3, shelf_position = $4, description = $5, active = $6, updated_at = now()
      WHERE id = $1 AND company_id = $7
      RETURNING *
    `, [req.params.id, parsed.warehouse_sector, parsed.aisle_area || null, parsed.shelf_position || null, parsed.description || null, parsed.active !== false, getCompanyId(req)]);
    if (!r.rows?.[0]) return res.status(404).json({ ok: false, error: 'Localização não encontrada' });
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ ok: false, error: err.errors?.[0]?.message || 'Dados inválidos' });
    console.error('[WAREHOUSE_LOCATION_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao atualizar' });
  }
});

router.delete('/locations/:id', ...adminMw, async (req, res) => {
  try {
    const r = await db.query(`
      UPDATE warehouse_locations SET active = false, updated_at = now()
      WHERE id = $1 AND company_id = $2 RETURNING id
    `, [req.params.id, getCompanyId(req)]);
    if (!r.rows?.[0]) return res.status(404).json({ ok: false, error: 'Localização não encontrada' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[WAREHOUSE_LOCATION_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao excluir' });
  }
});

// ============================================================================
// 4. CADASTRO DE MATERIAIS
// ============================================================================

router.get('/materials', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const r = await db.query(`
      SELECT m.*,
        c.name as category_name, c.code as category_code,
        s.name as supplier_name,
        l.warehouse_sector, l.aisle_area, l.shelf_position
      FROM warehouse_materials m
      LEFT JOIN warehouse_material_categories c ON c.id = m.category_id
      LEFT JOIN warehouse_suppliers s ON s.id = m.default_supplier_id
      LEFT JOIN warehouse_locations l ON l.id = m.default_location_id
      WHERE m.company_id = $1
      ORDER BY m.code
    `, [cid]);
    res.json({ ok: true, data: r.rows || [] });
  } catch (err) {
    console.error('[WAREHOUSE_MATERIALS_LIST]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao listar' });
  }
});

router.get('/materials/:id', ...adminMw, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT m.*,
        c.name as category_name, s.name as supplier_name,
        l.warehouse_sector, l.aisle_area, l.shelf_position
      FROM warehouse_materials m
      LEFT JOIN warehouse_material_categories c ON c.id = m.category_id
      LEFT JOIN warehouse_suppliers s ON s.id = m.default_supplier_id
      LEFT JOIN warehouse_locations l ON l.id = m.default_location_id
      WHERE m.id = $1 AND m.company_id = $2
    `, [req.params.id, getCompanyId(req)]);
    if (!r.rows?.[0]) return res.status(404).json({ ok: false, error: 'Material não encontrado' });
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    console.error('[WAREHOUSE_MATERIAL_GET]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

router.post('/materials', ...adminMw, async (req, res) => {
  try {
    const parsed = materialSchema.parse(req.body);
    const r = await db.query(`
      INSERT INTO warehouse_materials (company_id, name, code, category_id, default_supplier_id, unit, technical_description, min_stock, ideal_stock, usage_type, default_location_id, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      getCompanyId(req), parsed.name, parsed.code, parsed.category_id || null, parsed.default_supplier_id || null,
      parsed.unit || 'UN', parsed.technical_description || null, parsed.min_stock ?? 0, parsed.ideal_stock ?? 0,
      parsed.usage_type || 'general', parsed.default_location_id || null, parsed.active !== false
    ]);
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ ok: false, error: err.errors?.[0]?.message || 'Dados inválidos' });
    if (err.code === '23505') return res.status(409).json({ ok: false, error: 'Código já existe' });
    console.error('[WAREHOUSE_MATERIAL_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao cadastrar' });
  }
});

router.put('/materials/:id', ...adminMw, async (req, res) => {
  try {
    const parsed = materialSchema.parse(req.body);
    const r = await db.query(`
      UPDATE warehouse_materials SET
        name = $2, code = $3, category_id = $4, default_supplier_id = $5, unit = $6,
        technical_description = $7, min_stock = $8, ideal_stock = $9, usage_type = $10, default_location_id = $11, active = $12, updated_at = now()
      WHERE id = $1 AND company_id = $13
      RETURNING *
    `, [
      req.params.id, parsed.name, parsed.code, parsed.category_id || null, parsed.default_supplier_id || null,
      parsed.unit || 'UN', parsed.technical_description || null, parsed.min_stock ?? 0, parsed.ideal_stock ?? 0,
      parsed.usage_type || 'general', parsed.default_location_id || null, parsed.active !== false, getCompanyId(req)
    ]);
    if (!r.rows?.[0]) return res.status(404).json({ ok: false, error: 'Material não encontrado' });
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ ok: false, error: err.errors?.[0]?.message || 'Dados inválidos' });
    if (err.code === '23505') return res.status(409).json({ ok: false, error: 'Código já existe' });
    console.error('[WAREHOUSE_MATERIAL_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao atualizar' });
  }
});

router.delete('/materials/:id', ...adminMw, async (req, res) => {
  try {
    const r = await db.query(`
      UPDATE warehouse_materials SET active = false, updated_at = now()
      WHERE id = $1 AND company_id = $2 RETURNING id
    `, [req.params.id, getCompanyId(req)]);
    if (!r.rows?.[0]) return res.status(404).json({ ok: false, error: 'Material não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[WAREHOUSE_MATERIAL_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao excluir' });
  }
});

// ============================================================================
// 5. PARÂMETROS DE ESTOQUE
// ============================================================================

router.get('/params', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    let r = await db.query(`SELECT * FROM warehouse_params WHERE company_id = $1`, [cid]);
    if (!r.rows?.[0]) {
      await db.query(`
        INSERT INTO warehouse_params (company_id) VALUES ($1) ON CONFLICT (company_id) DO NOTHING
      `, [cid]);
      r = await db.query(`SELECT * FROM warehouse_params WHERE company_id = $1`, [cid]);
    }
    res.json({ ok: true, data: r.rows[0] || {} });
  } catch (err) {
    console.error('[WAREHOUSE_PARAMS_GET]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

router.put('/params', ...adminMw, async (req, res) => {
  try {
    const parsed = paramsSchema.parse(req.body);
    const cid = getCompanyId(req);
    await db.query(`
      INSERT INTO warehouse_params (company_id, min_safety_stock_pct, critical_level_pct, replenishment_alert_days, consumption_analysis_frequency)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (company_id) DO UPDATE SET
        min_safety_stock_pct = COALESCE(EXCLUDED.min_safety_stock_pct, warehouse_params.min_safety_stock_pct),
        critical_level_pct = COALESCE(EXCLUDED.critical_level_pct, warehouse_params.critical_level_pct),
        replenishment_alert_days = COALESCE(EXCLUDED.replenishment_alert_days, warehouse_params.replenishment_alert_days),
        consumption_analysis_frequency = COALESCE(EXCLUDED.consumption_analysis_frequency, warehouse_params.consumption_analysis_frequency),
        updated_at = now()
    `, [
      cid,
      parsed.min_safety_stock_pct ?? 20,
      parsed.critical_level_pct ?? 10,
      parsed.replenishment_alert_days ?? 7,
      parsed.consumption_analysis_frequency ?? 'daily'
    ]);
    const r = await db.query(`SELECT * FROM warehouse_params WHERE company_id = $1`, [cid]);
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ ok: false, error: err.errors?.[0]?.message || 'Dados inválidos' });
    console.error('[WAREHOUSE_PARAMS_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao atualizar' });
  }
});

// ============================================================================
// 6. MOVIMENTAÇÕES (listar e registrar)
// ============================================================================

router.get('/movements', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const { material_id, movement_type, limit = 100, offset = 0 } = req.query;
    let q = `
      SELECT wm.*, m.name as material_name, m.code as material_code, m.unit,
        u.name as user_name
      FROM warehouse_movements wm
      JOIN warehouse_materials m ON m.id = wm.material_id
      LEFT JOIN users u ON u.id = wm.user_id
      WHERE wm.company_id = $1
    `;
    const params = [cid];
    if (material_id) { params.push(material_id); q += ` AND wm.material_id = $${params.length}`; }
    if (movement_type) { params.push(movement_type); q += ` AND wm.movement_type = $${params.length}`; }
    q += ` ORDER BY wm.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit, 10) || 100, parseInt(offset, 10) || 0);

    const r = await db.query(q, params);
    res.json({ ok: true, data: r.rows || [] });
  } catch (err) {
    console.error('[WAREHOUSE_MOVEMENTS_LIST]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao listar' });
  }
});

router.post('/movements', ...adminMw, async (req, res) => {
  try {
    const parsed = movementSchema.parse(req.body);
    const cid = getCompanyId(req);
    const userId = req.user?.id;

    const sign = parsed.movement_type === 'entrada' ? 1 : -1;
    const qty = parsed.quantity * sign;

    const r = await db.query(`
      INSERT INTO warehouse_movements (company_id, material_id, movement_type, quantity, location_id, reference_type, reference_id, work_order_id, process_id, production_line_id, asset_id, user_id, notes, document_ref)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      cid, parsed.material_id, parsed.movement_type, parsed.quantity,
      parsed.location_id || null, parsed.reference_type || null, parsed.reference_id || null,
      parsed.work_order_id || null, parsed.process_id || null, parsed.production_line_id || null, parsed.asset_id || null,
      userId, parsed.notes || null, parsed.document_ref || null
    ]);

    await db.query(`
      INSERT INTO warehouse_balances (company_id, material_id, quantity, last_movement_at, updated_at)
      VALUES ($1, $2, $3, now(), now())
      ON CONFLICT (company_id, material_id) DO UPDATE SET
        quantity = warehouse_balances.quantity + $3,
        last_movement_at = now(),
        updated_at = now()
    `, [cid, parsed.material_id, qty]);

    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ ok: false, error: err.errors?.[0]?.message || 'Dados inválidos' });
    console.error('[WAREHOUSE_MOVEMENT_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao registrar' });
  }
});

// ============================================================================
// 7. SALDOS (para dashboard e IA)
// ============================================================================

router.get('/balances', ...adminMw, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT b.*, m.name as material_name, m.code as material_code, m.unit, m.min_stock, m.ideal_stock
      FROM warehouse_balances b
      JOIN warehouse_materials m ON m.id = b.material_id
      WHERE b.company_id = $1 AND m.active
      ORDER BY b.quantity ASC
    `, [getCompanyId(req)]);
    res.json({ ok: true, data: r.rows || [] });
  } catch (err) {
    console.error('[WAREHOUSE_BALANCES]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao listar' });
  }
});

// ============================================================================
// 8. VÍNCULOS MATERIAIS x PROCESSOS
// ============================================================================

router.get('/links', ...adminMw, async (req, res) => {
  try {
    const { material_id, link_type } = req.query;
    let q = `
      SELECT l.*, m.name as material_name, m.code as material_code,
        p.name as process_name, pl.name as line_name, a.name as asset_name, d.name as department_name
      FROM warehouse_material_process_links l
      JOIN warehouse_materials m ON m.id = l.material_id
      LEFT JOIN company_processes p ON p.id = l.process_id
      LEFT JOIN production_lines pl ON pl.id = l.production_line_id
      LEFT JOIN assets a ON a.id = l.asset_id
      LEFT JOIN departments d ON d.id = l.department_id
      WHERE l.company_id = $1
    `;
    const params = [getCompanyId(req)];
    if (material_id) { params.push(material_id); q += ` AND l.material_id = $${params.length}`; }
    if (link_type) { params.push(link_type); q += ` AND l.link_type = $${params.length}`; }
    q += ' ORDER BY l.created_at DESC';
    const r = await db.query(q, params);
    res.json({ ok: true, data: r.rows || [] });
  } catch (err) {
    console.error('[WAREHOUSE_LINKS_LIST]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao listar' });
  }
});

router.post('/links', ...adminMw, async (req, res) => {
  try {
    const parsed = linkSchema.parse(req.body);
    const r = await db.query(`
      INSERT INTO warehouse_material_process_links (company_id, material_id, link_type, process_id, production_line_id, asset_id, department_id, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      getCompanyId(req), parsed.material_id, parsed.link_type,
      parsed.process_id || null, parsed.production_line_id || null, parsed.asset_id || null, parsed.department_id || null,
      parsed.notes || null
    ]);
    res.json({ ok: true, data: r.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ ok: false, error: err.errors?.[0]?.message || 'Dados inválidos' });
    console.error('[WAREHOUSE_LINK_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao vincular' });
  }
});

router.delete('/links/:id', ...adminMw, async (req, res) => {
  try {
    const r = await db.query(`
      DELETE FROM warehouse_material_process_links WHERE id = $1 AND company_id = $2 RETURNING id
    `, [req.params.id, getCompanyId(req)]);
    if (!r.rows?.[0]) return res.status(404).json({ ok: false, error: 'Vínculo não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[WAREHOUSE_LINK_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao remover' });
  }
});

// ============================================================================
// 9. REFERÊNCIAS (para dropdowns nos formulários)
// ============================================================================

router.get('/references', ...adminMw, async (req, res) => {
  try {
    const cid = getCompanyId(req);
    const [categories, suppliers, locations, materials, processes, lines, assets, depts] = await Promise.all([
      db.query('SELECT id, name, code FROM warehouse_material_categories WHERE company_id = $1 AND active ORDER BY name', [cid]),
      db.query('SELECT id, name FROM warehouse_suppliers WHERE company_id = $1 AND active ORDER BY name', [cid]),
      db.query('SELECT id, warehouse_sector, aisle_area, shelf_position FROM warehouse_locations WHERE company_id = $1 AND active ORDER BY warehouse_sector', [cid]),
      db.query('SELECT id, name, code FROM warehouse_materials WHERE company_id = $1 AND active ORDER BY code', [cid]),
      db.query('SELECT id, name FROM company_processes WHERE company_id = $1 AND active ORDER BY name', [cid]).catch(() => ({ rows: [] })),
      db.query('SELECT id, name FROM production_lines WHERE company_id = $1 AND active ORDER BY name', [cid]).catch(() => ({ rows: [] })),
      db.query('SELECT id, name FROM assets WHERE company_id = $1 AND active ORDER BY name', [cid]).catch(() => ({ rows: [] })),
      db.query('SELECT id, name FROM departments WHERE company_id = $1 AND active ORDER BY name', [cid]).catch(() => ({ rows: [] }))
    ]);
    res.json({
      ok: true,
      data: {
        categories: categories.rows,
        suppliers: suppliers.rows,
        locations: locations.rows,
        materials: materials.rows,
        processes: processes.rows || [],
        productionLines: lines.rows || [],
        assets: assets.rows || [],
        departments: depts.rows || []
      }
    });
  } catch (err) {
    console.error('[WAREHOUSE_REFERENCES]', err);
    res.status(500).json({ ok: false, error: 'Erro ao buscar referências' });
  }
});

module.exports = router;
