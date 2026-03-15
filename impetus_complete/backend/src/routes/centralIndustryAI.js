/**
 * IMPETUS - IA Central da Indústria
 * Cérebro central: coleta, processa e distribui informações de todos os setores
 * Dados filtrados por cargo (CEO, Diretor, Gerente, Supervisor, Profissional)
 */
const express = require('express');
const router = express.Router();
const centralAI = require('../services/centralIndustryAIService');
const { requireAuth } = require('../middleware/auth');

function getCompanyId(req) {
  return req.user?.company_id;
}

/**
 * GET /api/central-ai/intelligence
 * Inteligência central completa - alertas unificados, status dos setores, previsões (CEO/Diretor)
 */
router.get('/intelligence', requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const payload = await centralAI.getCentralIntelligence(companyId, req.user);
    res.json({ ok: true, ...payload });
  } catch (err) {
    console.error('[CENTRAL_AI_INTELLIGENCE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao carregar IA Central' });
  }
});

/**
 * GET /api/central-ai/alerts
 * Alertas unificados de todos os setores
 */
router.get('/alerts', requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const alerts = await centralAI.getUnifiedAlerts(companyId, req.user);
    res.json({ ok: true, alerts });
  } catch (err) {
    console.error('[CENTRAL_AI_ALERTS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao carregar alertas' });
  }
});

/**
 * GET /api/central-ai/sectors
 * Status consolidado por setor (RH, Produção, Almoxarifado, Qualidade, Logística, Manutenção)
 */
router.get('/sectors', requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const sectors = await centralAI.getSectorStatus(companyId, req.user);
    res.json({ ok: true, sectors });
  } catch (err) {
    console.error('[CENTRAL_AI_SECTORS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao carregar setores' });
  }
});

/**
 * GET /api/central-ai/predictions
 * Previsões estratégicas (apenas CEO e Diretores)
 */
router.get('/predictions', requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const level = centralAI.getRoleLevel(req.user);
    if (level !== 'ceo' && level !== 'diretor') {
      return res.status(403).json({ ok: false, error: 'Previsões estratégicas restritas a CEO e Diretores' });
    }
    const predictions = await centralAI.getStrategicPredictions(companyId, req.user);
    res.json({ ok: true, predictions });
  } catch (err) {
    console.error('[CENTRAL_AI_PREDICTIONS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao carregar previsões' });
  }
});

/**
 * GET /api/central-ai/insights
 * Insights consolidados cross-setor
 */
router.get('/insights', requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const insights = await centralAI.getCentralInsights(companyId, req.user);
    res.json({ ok: true, insights });
  } catch (err) {
    console.error('[CENTRAL_AI_INSIGHTS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao carregar insights' });
  }
});

module.exports = router;
