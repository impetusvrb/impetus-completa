'use strict';

const express = require('express');
const { requireAdminAuth, requireAdminProfiles } = require('../middleware/adminPortalAuth');
const aiIncidentGovernanceService = require('../services/aiIncidentGovernanceService');
const riskIntelligenceService = require('../services/riskIntelligenceService');
const aiComplianceEngine = require('../services/aiComplianceEngine');
const aiPolicyService = require('../services/aiPolicyService');
const observabilityService = require('../services/observabilityService');
const aiLearningFeedbackService = require('../services/aiLearningFeedbackService');
const complianceReportingService = require('../services/complianceReportingService');
const encryptionService = require('../services/encryptionService');

const router = express.Router();

/** Governança global: apenas super_admin (equipa Impetus, visão multi-tenant). */
const requireGlobalGovernance = requireAdminProfiles('super_admin');

router.get('/system-health', requireAdminAuth, requireGlobalGovernance, (_req, res) => {
  try {
    const { metrics, system_status, alerts, timestamp } = observabilityService.getSystemHealthPayload();
    res.json({ ok: true, metrics, system_status, alerts, timestamp });
  } catch (e) {
    console.error('[ADMIN_PORTAL_SYSTEM_HEALTH]', e);
    res.status(500).json({ ok: false, error: 'Erro ao obter saúde do sistema' });
  }
});

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

router.get(
  '/compliance/advanced',
  requireAdminAuth,
  requireGlobalGovernance,
  async (_req, res) => {
    try {
      const data = await aiComplianceEngine.getAdvancedComplianceDashboard();
      res.json({ ok: true, data });
    } catch (e) {
      console.error('[ADMIN_PORTAL_COMPLIANCE_ADVANCED]', e);
      res.status(500).json({ ok: false, error: 'Erro ao obter conformidade avançada' });
    }
  }
);

router.get('/policies', requireAdminAuth, requireGlobalGovernance, async (req, res) => {
  try {
    const companyId = req.query.company_id ? String(req.query.company_id).trim() : null;
    const items = await aiPolicyService.listPolicies({ companyId, superAdmin: true });
    res.json({ ok: true, data: { items } });
  } catch (e) {
    console.error('[ADMIN_PORTAL_POLICIES_LIST]', e);
    res.status(500).json({ ok: false, error: 'Erro ao listar políticas' });
  }
});

router.post('/policies', requireAdminAuth, requireGlobalGovernance, async (req, res) => {
  try {
    const row = await aiPolicyService.createPolicy(req.body || {}, { superAdmin: true });
    res.status(201).json({ ok: true, data: { policy: row } });
  } catch (e) {
    if (e.code === 'INVALID_POLICY_TYPE' || e.code === 'COMPANY_NOT_FOUND') {
      return res.status(400).json({ ok: false, error: e.message, code: e.code });
    }
    console.error('[ADMIN_PORTAL_POLICIES_CREATE]', e);
    res.status(500).json({ ok: false, error: 'Erro ao criar política' });
  }
});

router.put('/policies/:id', requireAdminAuth, requireGlobalGovernance, async (req, res) => {
  try {
    const row = await aiPolicyService.updatePolicy(req.params.id, req.body || {}, { superAdmin: true });
    if (!row) return res.status(404).json({ ok: false, error: 'Política não encontrada' });
    res.json({ ok: true, data: { policy: row } });
  } catch (e) {
    if (e.code === 'INVALID_POLICY_TYPE') {
      return res.status(400).json({ ok: false, error: e.message, code: e.code });
    }
    console.error('[ADMIN_PORTAL_POLICIES_UPDATE]', e);
    res.status(500).json({ ok: false, error: 'Erro ao atualizar política' });
  }
});

router.delete('/policies/:id', requireAdminAuth, requireGlobalGovernance, async (req, res) => {
  try {
    const row = await aiPolicyService.deletePolicy(req.params.id, { superAdmin: true });
    if (!row) return res.status(404).json({ ok: false, error: 'Política não encontrada' });
    res.json({ ok: true, data: { deleted: row.id } });
  } catch (e) {
    console.error('[ADMIN_PORTAL_POLICIES_DELETE]', e);
    res.status(500).json({ ok: false, error: 'Erro ao remover política' });
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

router.get('/ai-learning', requireAdminAuth, requireGlobalGovernance, (_req, res) => {
  try {
    const data = aiLearningFeedbackService.getAdminSnapshot();
    res.json({ ok: true, data });
  } catch (e) {
    console.error('[ADMIN_PORTAL_AI_LEARNING]', e);
    res.status(500).json({ ok: false, error: 'Erro ao obter métricas de aprendizagem assistida' });
  }
});

/** Relatórios de conformidade agregados (LGPD / ISO 42001): super_admin visão global; comercial/suporte exige company_id. */
router.get('/security/encryption-status', requireAdminAuth, requireGlobalGovernance, async (_req, res) => {
  try {
    const data = await encryptionService.getAtRestCoverageStats();
    res.json({ ok: true, data });
  } catch (e) {
    console.error('[ADMIN_PORTAL_ENCRYPTION_STATUS]', e);
    res.status(500).json({ ok: false, error: 'Erro ao obter estado de criptografia' });
  }
});

router.get('/compliance/reports', requireAdminAuth, async (req, res) => {
  const perfil = req.adminUser?.perfil;
  if (!['super_admin', 'admin_comercial', 'admin_suporte'].includes(perfil)) {
    return res.status(403).json({ ok: false, error: 'Permissão insuficiente', code: 'ADMIN_FORBIDDEN' });
  }
  try {
    const report = await complianceReportingService.generateComplianceReport({
      adminProfile: perfil,
      company_id: req.query.company_id != null ? String(req.query.company_id).trim() : null,
      period_start: req.query.period_start,
      period_end: req.query.period_end,
      report_type: req.query.report_type,
      format: req.query.format
    });
    if (!report.ok) {
      const code = report.code === 'ACCESS_DENIED' ? 403 : 400;
      return res.status(code).json({ ok: false, error: report.error, code: report.code });
    }
    res.json({ ok: true, data: report });
  } catch (e) {
    console.error('[ADMIN_PORTAL_COMPLIANCE_REPORT]', e);
    res.status(500).json({ ok: false, error: 'Erro ao gerar relatório de conformidade' });
  }
});

module.exports = router;
