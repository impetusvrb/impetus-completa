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

/**
 * Agregação bounded — evita full scan em outbox com milhões de linhas por domínio.
 */
async function queryEnvironmentEventSummary(companyId) {
  const db = require('../db');
  await db.query(`SET LOCAL statement_timeout = '4000'`);
  const r = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE event_name LIKE 'environment.emission%')::int AS emissions,
       COUNT(*) FILTER (WHERE event_name LIKE 'environment.waste%')::int AS waste,
       COUNT(*) FILTER (WHERE event_name LIKE 'environment.water%')::int AS water,
       COUNT(*) FILTER (WHERE event_name LIKE 'environment.field%')::int AS field_events,
       COUNT(*)::int AS total
     FROM (
       SELECT event_name
       FROM industrial_event_outbox
       WHERE company_id = $1::uuid AND domain = 'environment'
         AND created_at > now() - interval '30 days'
       ORDER BY created_at DESC
       LIMIT 5000
     ) recent`,
    [companyId]
  );
  try {
    const monitor = require('../domains/environment/telemetry/validation/environmentTelemetryOutboxValidationService');
    const sub = await db.query(
      `SELECT COUNT(*)::int AS c FROM (
         SELECT event_name FROM industrial_event_outbox
         WHERE company_id = $1::uuid AND event_name = 'environment.telemetry.sample_ingested'
         AND created_at > now() - interval '30 days'
         ORDER BY created_at DESC LIMIT 5000
       ) s`,
      [companyId]
    );
    if ((sub.rows?.[0]?.c || 0) > 0) {
      monitor.recordConsumerAccess({
        module: 'environment_operational_ui',
        service: 'queryEnvironmentEventSummary',
        endpoint: 'GET /api/environment-operational/events/summary',
        company_id: companyId,
        event_name: 'environment.telemetry.sample_ingested',
        context: { bounded_sample: sub.rows[0].c }
      });
    }
  } catch (_e) {
    /* monitor aditivo — nunca bloqueia */
  }
  return r.rows[0] || { emissions: 0, waste: 0, water: 0, field_events: 0, total: 0 };
}

async function queryEnvironmentEventList(companyId, limit) {
  const db = require('../db');
  await db.query(`SET LOCAL statement_timeout = '4000'`);
  const r = await db.query(
    `SELECT id, event_name, correlation_id, envelope, created_at
     FROM industrial_event_outbox
     WHERE company_id = $1::uuid AND domain = 'environment'
     ORDER BY created_at DESC LIMIT $2`,
    [companyId, limit]
  );
  const rows = r.rows || [];
  try {
    const sampleHits = rows.filter((row) => row.event_name === 'environment.telemetry.sample_ingested');
    if (sampleHits.length > 0) {
      const monitor = require('../domains/environment/telemetry/validation/environmentTelemetryOutboxValidationService');
      monitor.recordConsumerAccess({
        module: 'environment_operational_ui',
        service: 'queryEnvironmentEventList',
        endpoint: 'GET /api/environment-operational/events',
        company_id: companyId,
        event_name: 'environment.telemetry.sample_ingested',
        context: { rows_matched: sampleHits.length, limit }
      });
    }
  } catch (_e) {
    /* monitor aditivo */
  }
  return rows;
}

/**
 * GET /api/environment-operational/events/summary — KPIs eventos ambientais (outbox industrial)
 */
router.get('/events/summary', async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'company_required' });

    const summary = await queryEnvironmentEventSummary(companyId);
    res.json({ ok: true, summary, bounded: true, window_days: 30, sample_limit: 5000 });
  } catch (err) {
    if (err?.code === '42P01') {
      return res.json({ ok: true, summary: { emissions: 0, waste: 0, water: 0, field_events: 0, total: 0 }, note: 'outbox_unavailable' });
    }
    if (err?.code === '57014') {
      return res.json({
        ok: true,
        summary: { emissions: 0, waste: 0, water: 0, field_events: 0, total: 0 },
        note: 'summary_timeout_bounded'
      });
    }
    console.error('[environmentOperational summary]', err?.message || err);
    res.status(500).json({ ok: false, error: err.message || 'internal_error' });
  }
});

/**
 * GET /api/environment-operational/events — eventos ambientais recentes
 */
router.get('/events', async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'company_required' });
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const rows = await queryEnvironmentEventList(companyId, limit);
    const events = rows.map((row) => ({
      id: row.id,
      event_name: row.event_name,
      correlation_id: row.correlation_id,
      created_at: row.created_at,
      payload: row.envelope?.payload || row.envelope?.metadata || {}
    }));
    res.json({ ok: true, events });
  } catch (err) {
    if (err?.code === '42P01') {
      return res.json({ ok: true, events: [], note: 'outbox_unavailable' });
    }
    if (err?.code === '57014') {
      return res.json({ ok: true, events: [], note: 'list_timeout' });
    }
    console.error('[environmentOperational list]', err?.message || err);
    res.status(500).json({ ok: false, error: err.message || 'internal_error' });
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
