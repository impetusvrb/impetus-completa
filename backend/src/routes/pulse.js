/**
 * Impetus Pulse — autoavaliação, blind supervisor, RH e agregados de gestão.
 */
const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, requireRhManagementAccess } = require('../middleware/auth');
const pulseService = require('../services/pulseService');

const jsonBody = express.json({ limit: '256kb' });

function billingFromReq(req) {
  return { companyId: req.user?.company_id, userId: req.user?.id };
}

/** Configuração global (admin) */
router.get('/admin/settings', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const s = await pulseService.getCompanySettings(companyId);
    res.json({ ok: true, settings: s });
  } catch (e) {
    console.error('[PULSE_ADMIN_SETTINGS_GET]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.put('/admin/settings', requireAuth, requireRole('admin'), jsonBody, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const enabled = !!req.body?.pulse_enabled;
    const s = await pulseService.setCompanyPulseEnabled(companyId, enabled);
    res.json({ ok: true, settings: s });
  } catch (e) {
    console.error('[PULSE_ADMIN_SETTINGS_PUT]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** Pop-up / estado do colaborador */
router.get('/me/prompt', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const memberId = req.user.active_operational_team_member_id;
    const out =
      req.user.is_factory_team_account && memberId
        ? await pulseService.getPendingPromptForTeamMember(companyId, memberId)
        : await pulseService.getPendingPromptForUser(companyId, req.user.id);
    res.json({ ok: true, ...out });
  } catch (e) {
    console.error('[PULSE_ME_PROMPT]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/me/start', requireAuth, jsonBody, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const memberId = req.user.active_operational_team_member_id;
    const evaluation =
      req.user.is_factory_team_account && memberId
        ? await pulseService.startEvaluationForTeamMember(companyId, memberId, billingFromReq(req))
        : await pulseService.startEvaluation(companyId, req.user.id, billingFromReq(req));
    res.json({ ok: true, evaluation });
  } catch (e) {
    console.error('[PULSE_ME_START]', e);
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.post('/me/submit', requireAuth, jsonBody, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const evaluationId = req.body?.evaluation_id;
    if (!evaluationId) return res.status(400).json({ ok: false, error: 'evaluation_id obrigatório' });
    const memberId = req.user.active_operational_team_member_id;
    const result =
      req.user.is_factory_team_account && memberId
        ? await pulseService.submitSelfEvaluationForTeamMember(
            companyId,
            memberId,
            evaluationId,
            req.body,
            billingFromReq(req)
          )
        : await pulseService.submitSelfEvaluation(companyId, req.user.id, evaluationId, req.body, billingFromReq(req));
    res.json({ ok: true, ...result });
  } catch (e) {
    console.error('[PULSE_ME_SUBMIT]', e);
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.get('/me/motivation', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const memberId = req.user.active_operational_team_member_id;
    const row =
      req.user.is_factory_team_account && memberId
        ? await pulseService.getMotivationPillForTeamMember(companyId, memberId)
        : await pulseService.getMotivationPillForUser(companyId, req.user.id);
    res.json({ ok: true, pill: row });
  } catch (e) {
    console.error('[PULSE_ME_MOTIVATION]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** Supervisor — cego */
router.get('/supervisor/pending', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const rows = await pulseService.listSupervisorBlindPending(companyId, req.user.id);
    res.json({ ok: true, pending: rows, count: rows.length });
  } catch (e) {
    console.error('[PULSE_SUP_PENDING]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/supervisor/:evaluationId/perception', requireAuth, jsonBody, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const result = await pulseService.submitSupervisorPerception(
      companyId,
      req.user.id,
      req.params.evaluationId,
      req.body?.perception || req.body?.text
    );
    res.json({ ok: true, ...result });
  } catch (e) {
    console.error('[PULSE_SUP_PERCEPTION]', e);
    res.status(400).json({ ok: false, error: e.message });
  }
});

/** RH — analytics agregado (temporal, setor, status, dispersão) */
router.get('/hr/analytics', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const data = await pulseService.getHrAnalytics(companyId, {
      from: req.query.from,
      to: req.query.to,
      bucket: req.query.bucket,
      department_id: req.query.department_id,
      shift_code: req.query.shift_code,
      team_label: req.query.team_label
    });
    res.json({ ok: true, analytics: data });
  } catch (e) {
    console.error('[PULSE_HR_ANALYTICS]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** RH — dados completos */
router.get('/hr/evaluations', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const rows = await pulseService.listHrEvaluations(companyId, {
      from: req.query.from,
      to: req.query.to,
      status: req.query.status,
      limit: req.query.limit
    });
    res.json({ ok: true, evaluations: rows });
  } catch (e) {
    console.error('[PULSE_HR_LIST]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/hr/trigger', requireAuth, requireRhManagementAccess, jsonBody, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const result = await pulseService.triggerCampaignForUsers(companyId, req.body?.user_ids, {
      all_eligible: !!req.body?.all_eligible
    });
    res.json({ ok: true, ...result });
  } catch (e) {
    console.error('[PULSE_HR_TRIGGER]', e);
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.post('/hr/report/:evaluationId', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const report = await pulseService.generateHrReport(companyId, req.user.id, req.params.evaluationId, billingFromReq(req));
    res.json({ ok: true, report });
  } catch (e) {
    console.error('[PULSE_HR_REPORT]', e);
    res.status(400).json({ ok: false, error: e.message });
  }
});

/** Estado do módulo na empresa (RH não usa /pulse/admin/settings — exige role admin). */
router.get('/hr/company-settings', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const s = await pulseService.getCompanySettings(companyId);
    res.json({ ok: true, settings: { pulse_enabled: !!s.pulse_enabled } });
  } catch (e) {
    console.error('[PULSE_HR_COMPANY_SETTINGS]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/hr/campaigns', requireAuth, requireRhManagementAccess, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const rows = await pulseService.listCampaigns(companyId);
    res.json({ ok: true, campaigns: rows });
  } catch (e) {
    console.error('[PULSE_HR_CAMPAIGNS]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/hr/campaigns', requireAuth, requireRhManagementAccess, jsonBody, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const c = await pulseService.createCampaign(companyId, req.body || {}, req.user.id);
    res.json({ ok: true, campaign: c });
  } catch (e) {
    console.error('[PULSE_HR_CAMPAIGN_CREATE]', e);
    res.status(400).json({ ok: false, error: e.message });
  }
});

/** Gestão — apenas agregados (sem respostas individuais) */
router.get('/mgmt/aggregates', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'Empresa não identificada' });
    const role = String(req.user.role || '').toLowerCase();
    if (!pulseService.isMgmtAggregateRole(role)) {
      return res.status(403).json({ ok: false, error: 'Acesso restrito a gestão operacional.' });
    }
    const data = await pulseService.getMgmtAggregates(companyId, {
      from: req.query.from,
      to: req.query.to,
      department_id: req.query.department_id,
      bucket: req.query.bucket
    });
    res.json({ ok: true, aggregates: data });
  } catch (e) {
    console.error('[PULSE_MGMT_AGG]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
