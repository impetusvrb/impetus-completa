/**
 * IMPETUS - Detecção de Anomalias Operacionais
 * Histórico, alertas, reconhecimento, dashboard por perfil
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const anomalyService = require('../services/operationalAnomalyDetectionService');
const { requireAuth } = require('../middleware/auth');

/**
 * Determina nível de acesso ao módulo de anomalias
 */
function getAnomalyAccessLevel(user) {
  const role = (user.role || '').toLowerCase();
  const h = user.hierarchy_level ?? 5;
  if (role === 'ceo' || h <= 0) return { level: 'strategic', canAcknowledge: true };
  if (role === 'diretor' || h <= 1) return { level: 'strategic', canAcknowledge: true };
  if (role === 'gerente' || h <= 2) return { level: 'tactical', canAcknowledge: true };
  if (role === 'supervisor' || role === 'coordenador' || h <= 3) return { level: 'operational', canAcknowledge: true };
  return { level: null, canAcknowledge: false };
}

/**
 * GET /api/operational-anomalies/dashboard
 * Painel de anomalias conforme perfil
 */
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const access = getAnomalyAccessLevel(req.user);
    if (!access.level) return res.status(403).json({ ok: false, error: 'Sem acesso ao módulo de anomalias' });

    const [anomalies, alerts] = await Promise.all([
      anomalyService.listAnomalies(companyId, { limit: 20, acknowledged: false }),
      anomalyService.getAlertsForUser(companyId, req.user.id, req.user.hierarchy_level)
    ]);

    const summary = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days') as last_7d,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_count
      FROM operational_anomalies
      WHERE company_id = $1 AND acknowledged = false
    `, [companyId]);

    res.json({
      ok: true,
      dashboard: {
        access_level: access.level,
        anomalies,
        alerts,
        summary: {
          pending: anomalies.length,
          last_7d: parseInt(summary.rows?.[0]?.last_7d || 0, 10),
          critical: parseInt(summary.rows?.[0]?.critical_count || 0, 10)
        }
      }
    });
  } catch (err) {
    console.error('[ANOMALY_DASHBOARD]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao carregar painel' });
  }
});

/**
 * GET /api/operational-anomalies
 * Lista anomalias com filtros
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const access = getAnomalyAccessLevel(req.user);
    if (!access.level) return res.status(403).json({ ok: false, error: 'Sem acesso' });

    const { since, until, anomaly_type, acknowledged, limit } = req.query;
    const anomalies = await anomalyService.listAnomalies(companyId, {
      since: since || undefined,
      until: until || undefined,
      anomaly_type: anomaly_type || undefined,
      acknowledged: acknowledged === 'true' ? true : acknowledged === 'false' ? false : undefined,
      limit: parseInt(limit, 10) || 50
    });
    res.json({ ok: true, anomalies });
  } catch (err) {
    console.error('[ANOMALY_LIST]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao listar anomalias' });
  }
});

/**
 * GET /api/operational-anomalies/:id
 * Detalhe de uma anomalia
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const access = getAnomalyAccessLevel(req.user);
    if (!access.level) return res.status(403).json({ ok: false, error: 'Sem acesso' });

    const r = await db.query(`
      SELECT * FROM operational_anomalies WHERE id = $1 AND company_id = $2
    `, [req.params.id, companyId]);
    if (!r.rows?.[0]) return res.status(404).json({ ok: false, error: 'Anomalia não encontrada' });
    res.json({ ok: true, anomaly: r.rows[0] });
  } catch (err) {
    console.error('[ANOMALY_GET]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao buscar anomalia' });
  }
});

/**
 * POST /api/operational-anomalies/:id/acknowledge
 * Reconhece anomalia e registra ações
 */
router.post('/:id/acknowledge', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const access = getAnomalyAccessLevel(req.user);
    if (!access.canAcknowledge) return res.status(403).json({ ok: false, error: 'Sem permissão para reconhecer' });

    const { actions, resolution_notes } = req.body;
    await anomalyService.acknowledgeAnomaly(
      req.params.id,
      req.user.id,
      companyId,
      Array.isArray(actions) ? actions : [],
      resolution_notes || ''
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[ANOMALY_ACK]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao reconhecer anomalia' });
  }
});

/**
 * GET /api/operational-anomalies/alerts
 * Alertas de anomalias para o usuário
 */
router.get('/alerts/list', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const access = getAnomalyAccessLevel(req.user);
    if (!access.level) return res.json({ ok: true, alerts: [] });

    const alerts = await anomalyService.getAlertsForUser(
      companyId,
      req.user.id,
      req.user.hierarchy_level
    );
    res.json({ ok: true, alerts });
  } catch (err) {
    console.error('[ANOMALY_ALERTS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao carregar alertas' });
  }
});

/**
 * POST /api/operational-anomalies/alerts/:id/read
 * Marca alerta como lido
 */
router.post('/alerts/:id/read', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    await db.query(`
      UPDATE operational_anomaly_alerts SET read_at = now() WHERE id = $1 AND company_id = $2
    `, [req.params.id, companyId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[ANOMALY_ALERT_READ]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

/**
 * POST /api/operational-anomalies/run-cycle
 * Executa ciclo de detecção manual (apenas hierarquia <= 2)
 */
router.post('/run-cycle', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const h = req.user.hierarchy_level ?? 5;
    if (h > 2) return res.status(403).json({ ok: false, error: 'Apenas gerentes e acima podem executar' });

    const result = await anomalyService.runDetectionCycle(companyId);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[ANOMALY_RUN_CYCLE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao executar detecção' });
  }
});

/**
 * GET /api/operational-anomalies/impact
 * Impacto para BI/Previsão (gerentes, diretores, CEO)
 */
router.get('/impact/forecasting', requireAuth, async (req, res) => {
  try {
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    const access = getAnomalyAccessLevel(req.user);
    if (!['tactical', 'strategic'].includes(access.level)) {
      return res.status(403).json({ ok: false, error: 'Sem acesso à visão de impacto' });
    }
    const days = parseInt(req.query.days, 10) || 7;
    const impact = await anomalyService.getAnomalyImpactForForecasting(companyId, days);
    res.json({ ok: true, impact });
  } catch (err) {
    console.error('[ANOMALY_IMPACT]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao carregar impacto' });
  }
});

module.exports = router;
