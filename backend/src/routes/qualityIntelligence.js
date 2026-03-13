/**
 * IMPETUS - Inteligência de Qualidade
 * Dashboard por cargo, inspeções, recebimentos, alertas
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const qualityService = require('../services/qualityIntelligenceService');
const { requireAuth } = require('../middleware/auth');

function canManageQuality(user) {
  const role = (user.role || '').toLowerCase();
  const fa = (user.functional_area || '').toLowerCase();
  const h = user.hierarchy_level ?? 5;
  return ['quality', 'qualidade'].includes(fa) || ['gerente', 'diretor', 'ceo', 'admin'].includes(role) || h <= 2;
}

/**
 * GET /api/quality-intelligence/dashboard
 * Painel filtrado por perfil (Supervisor/Gerente/Diretor/CEO)
 */
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const dashboard = await qualityService.getQualityDashboardForUser(companyId, req.user);
    res.json({ ok: true, dashboard });
  } catch (err) {
    console.error('[QUALITY_DASHBOARD]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao carregar painel' });
  }
});

/**
 * GET /api/quality-intelligence/inspections
 */
router.get('/inspections', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const profile = qualityService.getQualityProfileForUser(req.user);
    if (!profile.receives.some(x => ['inspection_records', 'non_conformities', 'defects_by_lot', 'quality_indicators'].includes(x))) {
      return res.status(403).json({ ok: false, error: 'Sem acesso a inspeções' });
    }
    const { since, until, result, limit } = req.query;
    const inspections = await qualityService.getInspections(companyId, { since, until, result, limit: parseInt(limit, 10) || 50 });
    res.json({ ok: true, inspections });
  } catch (err) {
    console.error('[QUALITY_INSPECTIONS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

/**
 * POST /api/quality-intelligence/inspections
 */
router.post('/inspections', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    if (!canManageQuality(req.user)) return res.status(403).json({ ok: false, error: 'Sem permissão para registrar inspeção' });
    const inspection = await qualityService.recordInspection(companyId, { ...req.body, inspector_id: req.user.id });
    res.json({ ok: true, inspection });
  } catch (err) {
    console.error('[QUALITY_INSPECTION_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao registrar' });
  }
});

/**
 * GET /api/quality-intelligence/receipts
 */
router.get('/receipts', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const profile = qualityService.getQualityProfileForUser(req.user);
    if (!profile.receives.length) return res.status(403).json({ ok: false, error: 'Sem acesso' });
    const { since, until, material_id, limit } = req.query;
    const receipts = await qualityService.getReceipts(companyId, { since, until, material_id, limit: parseInt(limit, 10) || 50 });
    res.json({ ok: true, receipts });
  } catch (err) {
    console.error('[QUALITY_RECEIPTS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

/**
 * POST /api/quality-intelligence/receipts
 */
router.post('/receipts', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    if (!canManageQuality(req.user)) return res.status(403).json({ ok: false, error: 'Sem permissão para registrar recebimento' });
    const receipt = await qualityService.recordReceipt(companyId, { ...req.body, inspector_id: req.user.id });
    res.json({ ok: true, receipt });
  } catch (err) {
    console.error('[QUALITY_RECEIPT_CREATE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao registrar' });
  }
});

/**
 * GET /api/quality-intelligence/alerts
 */
router.get('/alerts', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const r = await db.query(`
      SELECT * FROM quality_alerts
      WHERE company_id = $1 AND acknowledged = false
      AND (target_role_level IS NULL OR target_role_level >= $2)
      ORDER BY created_at DESC LIMIT 30
    `, [companyId, req.user.hierarchy_level ?? 5]);
    res.json({ ok: true, alerts: r.rows || [] });
  } catch (err) {
    console.error('[QUALITY_ALERTS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

/**
 * POST /api/quality-intelligence/alerts/:id/acknowledge
 */
router.post('/alerts/:id/acknowledge', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    await db.query(`
      UPDATE quality_alerts SET acknowledged = true, acknowledged_by = $2, acknowledged_at = now()
      WHERE id = $1 AND company_id = $3
    `, [req.params.id, req.user.id, companyId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[QUALITY_ALERT_ACK]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

/**
 * GET /api/quality-intelligence/indicators
 */
router.get('/indicators', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const profile = qualityService.getQualityProfileForUser(req.user);
    if (!['gerente', 'diretor', 'ceo'].includes(profile.level)) {
      return res.status(403).json({ ok: false, error: 'Sem acesso a indicadores' });
    }
    const days = parseInt(req.query.days, 10) || 30;
    const indicators = await qualityService.calculateQualityIndicators(companyId, days);
    res.json({ ok: true, indicators });
  } catch (err) {
    console.error('[QUALITY_INDICATORS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

/**
 * GET /api/quality-intelligence/impact
 * Impacto para previsão operacional
 */
router.get('/impact/forecasting', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const profile = qualityService.getQualityProfileForUser(req.user);
    if (!['gerente', 'diretor', 'ceo'].includes(profile.level)) return res.status(403).json({ ok: false, error: 'Sem acesso' });
    const days = parseInt(req.query.days, 10) || 7;
    const impact = await qualityService.getQualityImpactForForecasting(companyId, days);
    res.json({ ok: true, impact });
  } catch (err) {
    console.error('[QUALITY_IMPACT]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

/**
 * POST /api/quality-intelligence/run-alerts
 * Executa detecção de alertas (qualidade, gerente+)
 */
router.post('/run-alerts', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    if (!canManageQuality(req.user)) return res.status(403).json({ ok: false, error: 'Sem permissão' });
    const alerts = await qualityService.detectAndCreateQualityAlerts(companyId);
    res.json({ ok: true, alerts_created: alerts.length });
  } catch (err) {
    console.error('[QUALITY_RUN_ALERTS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

module.exports = router;
