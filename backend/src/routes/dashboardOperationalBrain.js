'use strict';

/**
 * Cérebro Operacional sob /api/dashboard/operational-brain
 * (contrato esperado pelo frontend: insights, alerts, timeline, summary, knowledge-map).
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

let operationalBrain;
let operationalInsights;
let operationalAlerts;
try {
  operationalBrain = require('../services/operationalBrainEngine');
} catch {
  operationalBrain = null;
}
try {
  operationalInsights = require('../services/operationalInsightsService');
  operationalAlerts = require('../services/operationalAlertsService');
} catch {
  operationalInsights = null;
  operationalAlerts = null;
}

const { enrichOperationalInsightRow } = require('../services/operationalBrainExplanationService');

function enrichSummaryInsights(summary) {
  if (!summary || typeof summary !== 'object') return summary;
  if (Array.isArray(summary.insights)) {
    summary.insights = summary.insights.map((r) => enrichOperationalInsightRow(r));
  }
  return summary;
}

router.get('/summary', requireAuth, async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) {
      return res.status(403).json({ ok: false, error: 'Empresa não identificada.' });
    }
    if (!operationalBrain?.getOperationalSummary) {
      return res.status(503).json({
        ok: false,
        brain_enabled: false,
        error: 'Cérebro operacional indisponível.'
      });
    }
    const summary = await operationalBrain.getOperationalSummary(companyId, {});
    enrichSummaryInsights(summary);
    res.json({
      ok: true,
      brain_enabled: !!operationalBrain.BRAIN_ENABLED,
      ...summary
    });
  } catch (err) {
    console.error('[DASHBOARD_OP_BRAIN_SUMMARY]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

router.get('/insights', requireAuth, async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) {
      return res.status(403).json({ ok: false, error: 'Empresa não identificada.' });
    }
    if (!operationalInsights?.listRecent) {
      return res.json({ ok: true, insights: [], brain_enabled: !!operationalBrain?.BRAIN_ENABLED });
    }
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const rows = await operationalInsights.listRecent(companyId, { limit });
    const insights = (rows || []).map((r) => enrichOperationalInsightRow(r));
    res.json({ ok: true, insights, brain_enabled: !!operationalBrain?.BRAIN_ENABLED });
  } catch (err) {
    console.error('[DASHBOARD_OP_BRAIN_INSIGHTS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

router.post('/insights/:id/read', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || !operationalInsights?.markAsRead) {
      return res.status(400).json({ ok: false, error: 'Pedido inválido.' });
    }
    await operationalInsights.markAsRead(id, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[DASHBOARD_OP_BRAIN_INSIGHT_READ]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

router.get('/alerts', requireAuth, async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) {
      return res.status(403).json({ ok: false, error: 'Empresa não identificada.' });
    }
    if (!operationalAlerts?.listPending) {
      return res.json({ ok: true, alerts: [] });
    }
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const alerts = await operationalAlerts.listPending(companyId, { limit });
    res.json({ ok: true, alerts: alerts || [] });
  } catch (err) {
    console.error('[DASHBOARD_OP_BRAIN_ALERTS]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

router.post('/alerts/:id/resolve', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || !operationalAlerts?.resolve) {
      return res.status(400).json({ ok: false, error: 'Pedido inválido.' });
    }
    await operationalAlerts.resolve(id, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[DASHBOARD_OP_BRAIN_ALERT_RESOLVE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

router.get('/timeline', requireAuth, async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) {
      return res.status(403).json({ ok: false, error: 'Empresa não identificada.' });
    }
    if (!operationalAlerts?.getTimeline) {
      return res.json({ ok: true, timeline: [] });
    }
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const timeline = await operationalAlerts.getTimeline(companyId, { limit });
    res.json({ ok: true, timeline: timeline || [] });
  } catch (err) {
    console.error('[DASHBOARD_OP_BRAIN_TIMELINE]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

router.post('/check-alerts', requireAuth, async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) {
      return res.status(403).json({ ok: false, error: 'Empresa não identificada.' });
    }
    if (!operationalBrain?.checkAlerts) {
      return res.json({ ok: true, created: [] });
    }
    const created = await operationalBrain.checkAlerts(companyId);
    res.json({ ok: true, created: created || [] });
  } catch (err) {
    console.error('[DASHBOARD_OP_BRAIN_CHECK]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro' });
  }
});

router.get('/knowledge-map', requireAuth, async (req, res) => {
  res.json({
    ok: true,
    mapa: {
      titulo: 'Mapa de conhecimento',
      nos: [],
      ligacoes: [],
      nota:
        'Vista resumida. O detalhe completo está na memória corporativa e nos eventos ligados ao Cérebro Operacional.'
    }
  });
});

module.exports = router;
