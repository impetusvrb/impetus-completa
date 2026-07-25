'use strict';

/**
 * REG-002 R1 — Financial Leakage Recovery
 * Remonta /api/dashboard/financial-leakage/* → financialLeakageDetectorService
 * Sem alterar regras, UI ou o service.
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const financialLeakage = require('../services/financialLeakageDetectorService');

function resolveIncludeFinancial(user) {
  return financialLeakage.canViewFinancial(user?.role, user?.hierarchy_level);
}

router.get('/map', requireAuth, async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não identificada' });
    const includeFinancial = resolveIncludeFinancial(req.user);
    const map = await financialLeakage.getLeakMap(companyId, includeFinancial);
    res.json({ ok: true, map, include_financial: includeFinancial });
  } catch (err) {
    console.error('[FINANCIAL_LEAKAGE_MAP]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao carregar mapa de vazamento' });
  }
});

router.get('/ranking', requireAuth, async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não identificada' });
    const includeFinancial = resolveIncludeFinancial(req.user);
    const ranking = await financialLeakage.getLeakRanking(companyId, includeFinancial);
    res.json({ ok: true, ranking, include_financial: includeFinancial });
  } catch (err) {
    console.error('[FINANCIAL_LEAKAGE_RANKING]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao carregar ranking' });
  }
});

router.get('/alerts', requireAuth, async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não identificada' });
    const includeFinancial = resolveIncludeFinancial(req.user);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const alerts = await financialLeakage.getAlerts(companyId, limit, includeFinancial);
    res.json({ ok: true, alerts, include_financial: includeFinancial });
  } catch (err) {
    console.error('[FINANCIAL_LEAKAGE_ALERTS]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao carregar alertas' });
  }
});

router.get('/report', requireAuth, async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não identificada' });
    const includeFinancial = resolveIncludeFinancial(req.user);
    const report = await financialLeakage.generateAIReport(companyId, includeFinancial);
    res.json({ ok: true, report, include_financial: includeFinancial });
  } catch (err) {
    console.error('[FINANCIAL_LEAKAGE_REPORT]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao gerar relatório' });
  }
});

router.get('/projected-impact', requireAuth, async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não identificada' });
    const includeFinancial = resolveIncludeFinancial(req.user);
    const days = Math.min(parseInt(req.query.days, 10) || 30, 90);
    const projected = await financialLeakage.getProjectedImpact(companyId, days, includeFinancial);
    res.json({ ok: true, ...projected, include_financial: includeFinancial });
  } catch (err) {
    console.error('[FINANCIAL_LEAKAGE_PROJECTED]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao projetar impacto' });
  }
});

module.exports = router;
