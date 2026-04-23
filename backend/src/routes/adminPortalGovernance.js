'use strict';

const express = require('express');
const { requireAdminAuth, requireAdminProfiles } = require('../middleware/adminPortalAuth');
const aiIncidentGovernanceService = require('../services/aiIncidentGovernanceService');
const riskIntelligenceService = require('../services/riskIntelligenceService');
const aiComplianceEngine = require('../services/aiComplianceEngine');

const router = express.Router();

/** Governança global: apenas super_admin (equipa Impetus, visão multi-tenant). */
const requireGlobalGovernance = requireAdminProfiles('super_admin');

router.get(
  '/ai-incidents/metrics',
  requireAdminAuth,
  requireGlobalGovernance,
  async (req, res) => {
    try {
      const data = await aiIncidentGovernanceService.getGovernanceMetrics();
      res.json({ ok: true, data });
    } catch (e) {
      console.error('[ADMIN_PORTAL_AI_GOVERNANCE_METRICS]', e);
      res.status(500).json({ ok: false, error: 'Erro ao obter métricas de governança' });
    }
  }
);

router.get('/ai-incidents', requireAdminAuth, requireGlobalGovernance, async (req, res) => {
  try {
    const data = await aiIncidentGovernanceService.listGovernanceIncidents({
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      severity: req.query.severity,
      incident_type: req.query.incident_type,
      company_id: req.query.company_id ? String(req.query.company_id).trim() : null
    });
    res.json({ ok: true, data });
  } catch (e) {
    console.error('[ADMIN_PORTAL_AI_GOVERNANCE_LIST]', e);
    res.status(500).json({ ok: false, error: 'Erro ao listar incidentes (governança)' });
  }
});

router.get(
  '/risk-intelligence/overview',
  requireAdminAuth,
  requireGlobalGovernance,
  async (_req, res) => {
    try {
      const data = await riskIntelligenceService.getRiskOverview();
      res.json({ ok: true, data });
    } catch (e) {
      console.error('[ADMIN_PORTAL_RISK_INTEL_OVERVIEW]', e);
      res.status(500).json({ ok: false, error: 'Erro ao obter inteligência de risco' });
    }
  }
);

router.get('/risk-intelligence/users', requireAdminAuth, requireGlobalGovernance, async (req, res) => {
  try {
    const limit = req.query.limit;
    const data = await riskIntelligenceService.getTopRiskUsers(limit);
    res.json({ ok: true, data: { items: data } });
  } catch (e) {
    console.error('[ADMIN_PORTAL_RISK_INTEL_USERS]', e);
    res.status(500).json({ ok: false, error: 'Erro ao listar utilizadores de risco' });
  }
});

router.get(
  '/risk-intelligence/companies',
  requireAdminAuth,
  requireGlobalGovernance,
  async (req, res) => {
    try {
      const limit = req.query.limit;
      const data = await riskIntelligenceService.getTopRiskCompanies(limit);
      res.json({ ok: true, data: { items: data } });
    } catch (e) {
      console.error('[ADMIN_PORTAL_RISK_INTEL_COMPANIES]', e);
      res.status(500).json({ ok: false, error: 'Erro ao listar empresas de risco' });
    }
  }
);

router.get(
  '/risk-intelligence/timeseries',
  requireAdminAuth,
  requireGlobalGovernance,
  async (req, res) => {
    try {
      const days = req.query.days;
      const data = await riskIntelligenceService.getRiskTimeseries(days);
      res.json({ ok: true, data: { series: data } });
    } catch (e) {
      console.error('[ADMIN_PORTAL_RISK_INTEL_SERIES]', e);
      res.status(500).json({ ok: false, error: 'Erro ao obter série temporal de risco' });
    }
  }
);

router.get(
  '/compliance/overview',
  requireAdminAuth,
  requireGlobalGovernance,
  async (_req, res) => {
    try {
      const data = await aiComplianceEngine.getComplianceOverview();
      res.json({ ok: true, data });
    } catch (e) {
      console.error('[ADMIN_PORTAL_COMPLIANCE_OVERVIEW]', e);
      res.status(500).json({ ok: false, error: 'Erro ao obter visão de conformidade' });
    }
  }
);

router.get('/ai-incidents/:id', requireAdminAuth, requireGlobalGovernance, async (req, res) => {
  try {
    const payload = await aiIncidentGovernanceService.getGovernanceIncidentDetail(req.params.id);
    if (!payload) {
      return res.status(404).json({ ok: false, error: 'Incidente não encontrado' });
    }
    res.json({ ok: true, data: payload });
  } catch (e) {
    console.error('[ADMIN_PORTAL_AI_GOVERNANCE_DETAIL]', e);
    res.status(500).json({ ok: false, error: 'Erro ao obter detalhe do incidente' });
  }
});

module.exports = router;
