'use strict';

const express = require('express');
const { requireAdminAuth, requireAdminProfiles } = require('../middleware/adminPortalAuth');
const aiIncidentGovernanceService = require('../services/aiIncidentGovernanceService');

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
