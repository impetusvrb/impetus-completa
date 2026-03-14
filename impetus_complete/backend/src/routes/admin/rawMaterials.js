/**
 * ADMIN - Cadastro de Matérias-Primas
 * Apenas administradores (hierarchy <= 1)
 * nome, código, tipo, fornecedor, especificações, tolerâncias, certificações
 */
const express = require('express');
const router = express.Router();
const db = require('../../db');
const { requireAuth, requireHierarchy } = require('../../middleware/auth');
const { z } = require('zod');

const adminMw = [requireAuth, requireHierarchy(1)];

const rawMaterialSchema = z.object({
  name: z.string().min(2).max(200),
  code: z.string().min(1).max(64),
  material_type: z.string().max(100).optional(),
  default_supplier: z.string().max(200).optional(),
  technical_specs: z.record(z.any()).optional(),
  quality_tolerances: z.record(z.any()).optional(),
  certifications: z.array(z.string()).optional(),
  unit: z.string().max(20).optional(),
  active: z.boolean().optional()
});

/**
 * GET /api/admin/raw-materials
 */
router.get('/', ...adminMw, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT * FROM raw_materials WHERE company_id = $1 ORDER BY code
    `, [req.user.company_id]);
    res.json({ ok: true, materials: r.rows || [] });
  } catch (err) {
    console.error('[ADMIN_RAW_MATERIALS_LIST]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao listar' });
  }
});

/**
 * GET /api/admin/raw-materials/:id
 */
router.get('/:id', ...adminMw, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT * FROM raw_materials WHERE id = $1 AND company_id = $2
    `, [req.params.id, req.user.company_id]);
    if (!r.rows?.[0]) return res.status(404).json({ ok: false, error: 'Material não encontrado' });
    res.json({ ok: true, material: r.rows[0] });
  } catch (err) {
    console.error('[ADMIN_RAW_MATERIAL_GET]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

/**
 * POST /api/admin/raw-materials
 */
router.post('/', ...adminMw, async (req, res) => {
  try {
    const parsed = rawMaterialSchema.parse(req.body);
    const r = await db.query(`
      INSERT INTO raw_materials (company_id, name, code, material_type, default_supplier, technical_specs, quality_tolerances, certifications, unit, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      req.user.company_id, parsed.name, parsed.code, parsed.material_type || null,
      parsed.default_supplier || null, JSON.stringify(parsed.technical_specs || {}),
      JSON.stringify(parsed.quality_tolerances || {}), parsed.certifications || [],
      parsed.unit || 'UN', parsed.active !== false
    ]);
    res.json({ ok: true, material: r.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ ok: false, error: err.errors?.[0]?.message || 'Dados inválidos' });
    if (err.code === '23505') return res.status(409).json({ ok: false, error: 'Código já existe' });
    console.error('[ADMIN_RAW_MATERIAL_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao cadastrar' });
  }
});

/**
 * PUT /api/admin/raw-materials/:id
 */
router.put('/:id', ...adminMw, async (req, res) => {
  try {
    const parsed = rawMaterialSchema.parse(req.body);
    const r = await db.query(`
      UPDATE raw_materials SET
        name = $2, code = $3, material_type = $4, default_supplier = $5,
        technical_specs = $6, quality_tolerances = $7, certifications = $8, unit = $9, active = $10, updated_at = now()
      WHERE id = $1 AND company_id = $11
      RETURNING *
    `, [
      req.params.id, parsed.name, parsed.code, parsed.material_type || null,
      parsed.default_supplier || null, JSON.stringify(parsed.technical_specs || {}),
      JSON.stringify(parsed.quality_tolerances || {}), parsed.certifications || [],
      parsed.unit || 'UN', parsed.active !== false, req.user.company_id
    ]);
    if (!r.rows?.[0]) return res.status(404).json({ ok: false, error: 'Material não encontrado' });
    res.json({ ok: true, material: r.rows[0] });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ ok: false, error: err.errors?.[0]?.message || 'Dados inválidos' });
    if (err.code === '23505') return res.status(409).json({ ok: false, error: 'Código já existe' });
    console.error('[ADMIN_RAW_MATERIAL_UPDATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao atualizar' });
  }
});

/**
 * DELETE /api/admin/raw-materials/:id
 */
router.delete('/:id', ...adminMw, async (req, res) => {
  try {
    const r = await db.query(`
      UPDATE raw_materials SET active = false, updated_at = now()
      WHERE id = $1 AND company_id = $2
      RETURNING id
    `, [req.params.id, req.user.company_id]);
    if (!r.rows?.[0]) return res.status(404).json({ ok: false, error: 'Material não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[ADMIN_RAW_MATERIAL_DELETE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao excluir' });
  }
});

module.exports = router;
