'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const flags = require('../domains/environment/operational/environmentOperationalRuntimeFlags');
const { publishEnvironmentIndustrialEvent } = require('../domains/environment/events/environmentEventPublisher');
const { fanoutEnvironmentOperationalEvent } = require('../domains/environment/realtime/environmentOperationalSocketFanout');
const orchestrator = require('../domains/environment/operational/environmentOperationalOrchestrator');
const obs = require('../domains/environment/operational/shared/environmentOperationalObservability');

const ALLOWED_OPERATIONAL_EVENTS = new Set([
  'environment.water.sample_collected',
  'environment.water.threshold_exceeded',
  'environment.effluent.analysis_completed',
  'environment.emission.alert_triggered',
  'environment.waste.manifest_created',
  'environment.field.occurrence_registered',
  'environment.environmental.incident_opened',
  'environment.environmental.evidence_attached',
  'environment.offline.sync_started',
  'environment.offline.sync_completed',
  'environment.scan.performed',
  'environment.mobile.sync_completed'
]);

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    domain: 'environment',
    layer: 'operational',
    enabled: flags.isEnvironmentOperationalRuntimeEnabled(),
    flags: flags.getOperationalRuntimeFlagSnapshot(),
    assistive_only: true
  });
});

router.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (!flags.isEnvironmentOperationalRuntimeEnabled()) {
    return res.status(503).json({ ok: false, error: 'environment_operational_disabled', code: 'ENVIRONMENT_OPERATIONAL_OFF' });
  }
  next();
});

router.get('/workspace/:area/summary', (req, res) => {
  try {
    const user = req.user;
    const companyId = user?.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'company_required' });
    const summary = orchestrator.getWorkspaceSummary(req.params.area, { companyId, user });
    res.json(summary);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.post('/workspace/:area/record', express.json(), async (req, res) => {
  try {
    const user = req.user;
    const companyId = user?.company_id;
    if (!companyId || !/^[0-9a-f-]{36}$/i.test(String(companyId))) {
      return res.status(403).json({ ok: false, error: 'company_required' });
    }
    const t0 = Date.now();
    const result = await orchestrator.recordOperationalAction(req.params.area, {
      companyId,
      user,
      body: req.body || {}
    });
    obs.recordEnvironmentOperationalMetric('environment_sampling_runtime_ms', Date.now() - t0, {
      area: req.params.area
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.post('/events', async (req, res) => {
  try {
    const user = req.user;
    const companyId = user?.company_id;
    if (!companyId || !/^[0-9a-f-]{36}$/i.test(String(companyId))) {
      return res.status(403).json({ ok: false, error: 'company_required' });
    }

    const body = req.body || {};
    const eventName = String(body.event_name || '').trim().toLowerCase();
    if (!ALLOWED_OPERATIONAL_EVENTS.has(eventName)) {
      return res.status(400).json({ ok: false, error: 'event_not_allowed', event_name: eventName });
    }

    const correlationId = body.correlation_id || uuidv4();
    const t0 = Date.now();
    const result = await publishEnvironmentIndustrialEvent(
      {
        event_name: eventName,
        company_id: String(companyId),
        correlation_id: correlationId,
        causation_id: body.causation_id != null ? String(body.causation_id) : String(user.id || ''),
        trace_id: body.trace_id != null ? String(body.trace_id) : correlationId,
        workflow_id: body.workflow_id != null ? String(body.workflow_id) : null,
        idempotency_key:
          body.idempotency_key != null
            ? String(body.idempotency_key)
            : `environment_op:${eventName}:${correlationId}:${companyId}`,
        payload: body.payload && typeof body.payload === 'object' ? body.payload : {},
        occurred_at: body.occurred_at,
        metadata: {
          ...(body.metadata && typeof body.metadata === 'object' ? body.metadata : {}),
          actor_id: user.id != null ? String(user.id) : null,
          origin_layer: 'operational'
        }
      },
      {
        origin_layer: 'operational',
        intended_audience: body.intended_audience || 'operator',
        user_id: user.id
      }
    );

    obs.recordEnvironmentOperationalMetric('environment_operational_runtime_ms', Date.now() - t0, {
      event: eventName
    });

    if (!result.ok) {
      return res.status(503).json({ ok: false, reason: result.reason || 'publish_failed', result });
    }

    fanoutEnvironmentOperationalEvent(req, {
      companyId,
      user,
      eventName,
      correlationId,
      payload: body.payload && typeof body.payload === 'object' ? body.payload : {}
    });

    res.json({ ok: true, result });
  } catch (err) {
    console.error('[environmentOperational]', err?.message || err);
    res.status(500).json({ ok: false, error: err?.message || 'internal_error' });
  }
});

module.exports = router;
