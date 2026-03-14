/**
 * IMPETUS - Lotes de Matéria-Prima (Qualidade)
 * Cadastro, bloqueio, alertas, histórico, ranking de fornecedores
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const lotService = require('../services/rawMaterialLotDetectionService');
const { requireAuth } = require('../middleware/auth');

function canManageLots(user) {
  const role = (user.role || '').toLowerCase();
  const h = user.hierarchy_level ?? 5;
  return ['quality', 'qualidade', 'gerente', 'diretor', 'ceo', 'admin'].includes(role) || h <= 2;
}

/**
 * GET /api/raw-material-lots
 * Lista lotes
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const { status, limit } = req.query;
    const lots = await lotService.listLots(companyId, { status, limit: parseInt(limit, 10) || 50 });
    res.json({ ok: true, lots });
  } catch (err) {
    console.error('[LOTS_LIST]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao listar lotes' });
  }
});

/**
 * GET /api/raw-material-lots/blocked
 * Lista códigos de lotes bloqueados (para validação em formulários)
 */
router.get('/blocked', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const blocked = await lotService.getBlockedLotCodes(companyId);
    res.json({ ok: true, blocked });
  } catch (err) {
    console.error('[LOTS_BLOCKED]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

/**
 * GET /api/raw-material-lots/alerts/list
 * Alertas de risco de lote (antes de /:id)
 */
router.get('/alerts/list', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const r = await db.query(`
      SELECT a.*, l.lot_code, l.material_name, l.supplier_name
      FROM raw_material_lot_alerts a
      JOIN raw_material_lots l ON l.id = a.lot_id
      WHERE a.company_id = $1 AND a.acknowledged = false
      ORDER BY a.created_at DESC LIMIT 30
    `, [companyId]);
    res.json({ ok: true, alerts: r.rows || [] });
  } catch (err) {
    console.error('[LOT_ALERTS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

/**
 * GET /api/raw-material-lots/suppliers/ranking
 * Ranking de fornecedores (antes de /:id)
 */
router.get('/suppliers/ranking', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const ranking = await lotService.getSupplierRanking(companyId);
    res.json({ ok: true, ranking });
  } catch (err) {
    console.error('[SUPPLIER_RANKING]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

/**
 * POST /api/raw-material-lots/validate
 * Valida se lote pode ser usado (não está bloqueado)
 */
router.post('/validate', requireAuth, async (req, res) => {
  try {
    const { lot_code } = req.body;
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const blocked = await lotService.isLotBlocked(companyId, lot_code);
    res.json({ ok: true, allowed: !blocked, blocked });
  } catch (err) {
    console.error('[LOTS_VALIDATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

/**
 * GET /api/raw-material-lots/:id
 * Detalhe do lote
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const r = await db.query('SELECT * FROM raw_material_lots WHERE id = $1 AND company_id = $2', [req.params.id, companyId]);
    if (!r.rows?.[0]) return res.status(404).json({ ok: false, error: 'Lote não encontrado' });
    const history = await lotService.getLotHistory(companyId, req.params.id);
    res.json({ ok: true, lot: r.rows[0], history });
  } catch (err) {
    console.error('[LOT_GET]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

/**
 * PUT /api/raw-material-lots/:id/status
 * Altera status (blocked, released, in_analysis, quality_risk)
 */
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    if (!canManageLots(req.user)) return res.status(403).json({ ok: false, error: 'Sem permissão para alterar status de lote' });

    const { status, reason } = req.body;
    if (!['blocked', 'released', 'in_analysis', 'quality_risk'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Status inválido' });
    }
    await lotService.updateLotStatus(companyId, req.params.id, status, req.user.id, reason || '');
    res.json({ ok: true });
  } catch (err) {
    console.error('[LOT_STATUS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao alterar status' });
  }
});

/**
 * POST /api/raw-material-lots/alerts/:id/acknowledge
 */
router.post('/alerts/:id/acknowledge', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    await db.query(`
      UPDATE raw_material_lot_alerts SET acknowledged = true, acknowledged_by = $2, acknowledged_at = now()
      WHERE id = $1 AND company_id = $3
    `, [req.params.id, req.user.id, companyId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[LOT_ALERT_ACK]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

/**
 * POST /api/raw-material-lots/run-cycle
 * Executa detecção manual (qualidade, gerente+)
 */
router.post('/run-cycle', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    if (!canManageLots(req.user)) return res.status(403).json({ ok: false, error: 'Sem permissão' });
    const result = await lotService.runDetectionCycle(companyId);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[LOT_RUN_CYCLE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao executar detecção' });
  }
});

module.exports = router;
