'use strict';

const express = require('express');
const router = express.Router();
const flags = require('../domains/safety/runtime/safetyOperationalRuntimeFlags');
const operationalAlerts = require('../services/operationalAlertsService');
const { requireAuth } = require('../middleware/auth');

function canRegisterSstEvent(user) {
  const role = (user.role || '').toLowerCase();
  const fa = (user.functional_area || '').toLowerCase();
  const h = user.hierarchy_level ?? 5;
  return (
    ['safety', 'seguranca', 'sst', 'ehs'].includes(fa) ||
    ['gerente', 'diretor', 'ceo', 'admin', 'supervisor'].includes(role) ||
    h <= 3
  );
}

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    domain: 'safety',
    enabled: flags.isSafetyOperationalRuntimeEnabled(),
    flags: flags.getOperationalRuntimeFlagSnapshot()
  });
});

router.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (!flags.isSafetyOperationalRuntimeEnabled()) {
    return res.status(503).json({ ok: false, code: 'SAFETY_OPERATIONAL_OFF' });
  }
  next();
});

router.get('/workspace/summary', (req, res) => {
  res.json({
    ok: true,
    domain: 'safety',
    capabilities: ['inspection', 'incident', 'ptw', 'loto', 'epi', 'apr', 'ghe'],
    bounded: true
  });
});

/**
 * POST /api/safety-operational/events
 * Registo industrial: incidente | near_miss | training_expired
 */
router.post('/events', requireAuth, async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) {
      return res.status(400).json({ ok: false, error: 'Empresa não definida' });
    }
    if (!canRegisterSstEvent(req.user)) {
      return res.status(403).json({ ok: false, error: 'Sem permissão para registrar evento SST' });
    }

    const body = req.body || {};
    const kind = String(body.kind || '').trim();
    if (!operationalAlerts.SST_LIFECYCLE_KINDS[kind]) {
      return res.status(400).json({
        ok: false,
        error: 'kind inválido',
        allowed: Object.keys(operationalAlerts.SST_LIFECYCLE_KINDS)
      });
    }

    const out = await operationalAlerts.createSstLifecycleAlert(companyId, {
      kind,
      title: body.title,
      message: body.message,
      severity: body.severity,
      location: body.location,
      correlation_id: body.correlation_id,
      reported_by: req.user.id,
      metadata: body.metadata,
      hr_alert: body.hr_alert !== false
    });

    if (!out?.id) {
      return res.status(500).json({ ok: false, error: 'Falha ao persistir evento SST' });
    }

    const row = await operationalAlerts.listPending(companyId, { limit: 1 });
    const alert = (row || []).find((a) => String(a.id) === String(out.id)) || { id: out.id, tipo_alerta: out.tipo_alerta };

    res.json({
      ok: true,
      event: {
        id: out.id,
        kind,
        tipo_alerta: out.tipo_alerta,
        lifecycle_phase: kind === 'near_miss' ? 'SST_NEAR_MISS' : kind === 'training_expired' ? 'SST_TRAINING_EXPIRED' : 'SST_INCIDENT_CREATED'
      },
      alert
    });
  } catch (err) {
    console.error('[SAFETY_OPERATIONAL_EVENT]', err);
    res.status(500).json({ ok: false, error: err.message || 'Erro ao registrar evento SST' });
  }
});

module.exports = router;
