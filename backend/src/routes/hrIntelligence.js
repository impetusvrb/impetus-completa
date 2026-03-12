/**
 * IMPETUS - Inteligência de RH
 * Dashboard e APIs filtrados por cargo/perfil
 * Distribuição automática de informações via IA contextual
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const hrService = require('../services/hrIntelligenceService');
const timeClock = require('../services/timeClockIntegrationService');
const { requireAuth } = require('../middleware/auth');

/**
 * Carrega usuário completo com hr_responsibilities
 */
async function loadUserForHr(userId, companyId) {
  const r = await db.query(`
    SELECT id, name, email, role, company_id, job_title, department, department_id,
           hierarchy_level, functional_area, hr_responsibilities, hr_responsibilities_parsed
    FROM users WHERE id = $1 AND company_id = $2 AND active = true AND deleted_at IS NULL
  `, [userId, companyId]);
  const row = r.rows?.[0];
  if (!row) return null;
  return {
    ...row,
    hr_responsibilities_parsed: row.hr_responsibilities_parsed
      ? (typeof row.hr_responsibilities_parsed === 'string' ? JSON.parse(row.hr_responsibilities_parsed) : row.hr_responsibilities_parsed)
      : []
  };
}

/**
 * GET /api/hr-intelligence/dashboard
 * Painel filtrado por perfil (Supervisor/Gerente/Diretor/CEO)
 */
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const user = await loadUserForHr(req.user.id, companyId);
    if (!user) return res.status(404).json({ ok: false, error: 'Usuário não encontrado' });
    const dashboard = await hrService.getDashboardForUser(companyId, user);
    res.json({ ok: true, dashboard });
  } catch (err) {
    console.error('[HR_DASHBOARD]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao carregar painel' });
  }
});

/**
 * GET /api/hr-intelligence/indicators
 * Indicadores de jornada (conforme perfil)
 */
router.get('/indicators', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const user = await loadUserForHr(req.user.id, companyId);
    if (!user) return res.status(404).json({ ok: false, error: 'Usuário não encontrado' });
    const profile = hrService.getViewProfileForUser(user);
    if (profile.receives.length === 0) {
      return res.json({ ok: true, indicators: null, message: 'Sem acesso a indicadores de RH' });
    }
    const days = parseInt(req.query.days, 10) || 30;
    const indicators = await hrService.getIndicators(companyId, days);
    res.json({ ok: true, indicators });
  } catch (err) {
    console.error('[HR_INDICATORS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao carregar indicadores' });
  }
});

/**
 * GET /api/hr-intelligence/records
 * Registros de ponto (Supervisor/DP)
 */
router.get('/records', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const user = await loadUserForHr(req.user.id, companyId);
    if (!user) return res.status(404).json({ ok: false, error: 'Usuário não encontrado' });
    const profile = hrService.getViewProfileForUser(user);
    const allowed = ['relatorios_ponto', 'atrasos', 'faltas', 'horas_extras', 'inconsistencias'];
    if (!profile.receives.some(r => allowed.includes(r))) {
      return res.status(403).json({ ok: false, error: 'Sem acesso a registros de ponto' });
    }
    const { since, until, user_id, limit } = req.query;
    const records = await hrService.getRecords(companyId, {
      since: since || undefined,
      until: until || undefined,
      user_id: user_id || undefined,
      limit: parseInt(limit, 10) || 100
    });
    res.json({ ok: true, records });
  } catch (err) {
    console.error('[HR_RECORDS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao carregar registros' });
  }
});

/**
 * GET /api/hr-intelligence/alerts
 * Alertas de RH para o usuário
 */
router.get('/alerts', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const user = await loadUserForHr(req.user.id, companyId);
    if (!user) return res.status(404).json({ ok: false, error: 'Usuário não encontrado' });
    const profile = hrService.getViewProfileForUser(user);
    if (profile.receives.length === 0) return res.json({ ok: true, alerts: [] });
    const r = await db.query(`
      SELECT id, alert_type, severity, title, description, sector, created_at
      FROM hr_alerts
      WHERE company_id = $1 AND acknowledged = false
        AND (target_user_id IS NULL OR target_user_id = $2)
        AND (target_role_level IS NULL OR target_role_level >= $3)
      ORDER BY created_at DESC LIMIT 30
    `, [companyId, req.user.id, user.hierarchy_level ?? 5]);
    res.json({ ok: true, alerts: r.rows || [] });
  } catch (err) {
    console.error('[HR_ALERTS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao carregar alertas' });
  }
});

/**
 * POST /api/hr-intelligence/alerts/:id/acknowledge
 * Reconhecer alerta
 */
router.post('/alerts/:id/acknowledge', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    await db.query(`
      UPDATE hr_alerts SET acknowledged = true, acknowledged_by = $2, acknowledged_at = now()
      WHERE id = $1 AND company_id = $3
    `, [id, req.user.id, companyId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[HR_ALERT_ACK]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao reconhecer alerta' });
  }
});

/**
 * PATCH /api/hr-intelligence/my-responsibilities
 * Atualizar descrição de responsabilidades (IA extrai e distribui)
 */
router.patch('/my-responsibilities', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const parsed = await hrService.updateUserResponsibilities(req.user.id, companyId, text || '');
    res.json({ ok: true, responsibilities: parsed });
  } catch (err) {
    console.error('[HR_RESPONSIBILITIES]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao atualizar responsabilidades' });
  }
});

/**
 * GET /api/hr-intelligence/integration-status
 * Status da integração de ponto (sem credenciais)
 */
router.get('/integration-status', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const integration = await timeClock.getIntegration(companyId);
    res.json({
      ok: true,
      configured: !!integration,
      last_sync_at: integration?.last_sync_at || null,
      last_sync_status: integration?.last_sync_status || null,
      system_name: integration?.system_name || null
    });
  } catch (err) {
    console.error('[HR_INTEGRATION_STATUS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao verificar integração' });
  }
});

/**
 * GET /api/hr-intelligence/team-impact
 * Impacto da equipe para previsão operacional / Digital Twin
 */
router.get('/team-impact', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const user = await loadUserForHr(req.user.id, companyId);
    if (!user) return res.status(404).json({ ok: false, error: 'Usuário não encontrado' });
    const profile = hrService.getViewProfileForUser(user);
    const allowedLevels = ['gerente', 'diretor', 'ceo'];
    if (!allowedLevels.includes(profile.level)) {
      return res.status(403).json({ ok: false, error: 'Sem acesso a visão de impacto da equipe' });
    }
    const impact = await hrService.getTeamImpactForForecasting(companyId);
    res.json({ ok: true, impact });
  } catch (err) {
    console.error('[HR_TEAM_IMPACT]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao carregar impacto' });
  }
});

module.exports = router;
