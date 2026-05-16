'use strict';

/**
 * Quality Universal — Operational UX Runtime API (tenant-authenticated).
 * Publica eventos no industrial backbone com envelope governado.
 * Feature flag mestre: IMPETUS_QUALITY_OPERATIONAL_RUNTIME_ENABLED
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const flags = require('../domains/quality/runtime/qualityOperationalRuntimeFlags');
const { publishQualityIndustrialEvent } = require('../domains/quality/events/qualityEventPublisher');
const {
  fanoutQualityOperationalEvent
} = require('../domains/quality/realtime/qualityOperationalSocketFanout');

const ALLOWED_OPERATIONAL_EVENTS = new Set([
  'quality.inspection.started',
  'quality.inspection.saved',
  'quality.inspection.completed',
  'quality.evidence.attached',
  'quality.offline.sync_started',
  'quality.offline.sync_completed',
  'quality.scan.performed',
  'quality.kiosk.session_started',
  'quality.kiosk.session_closed'
]);

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    enabled: flags.isQualityOperationalRuntimeEnabled(),
    flags: flags.getOperationalRuntimeFlagSnapshot()
  });
});

router.use((req, res, next) => {
  if (!flags.isQualityOperationalRuntimeEnabled()) {
    return res.status(503).json({ ok: false, error: 'quality_operational_disabled', code: 'QUALITY_OPERATIONAL_OFF' });
  }
  next();
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
    const result = await publishQualityIndustrialEvent(
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
            : `quality_op:${eventName}:${correlationId}:${companyId}`,
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

    if (!result.ok) {
      return res.status(503).json({ ok: false, reason: result.reason || 'publish_failed', result });
    }

    fanoutQualityOperationalEvent(req, {
      companyId,
      user,
      eventName,
      correlationId,
      traceId: body.trace_id,
      workflowId: body.workflow_id,
      payload: body.payload && typeof body.payload === 'object' ? body.payload : {}
    });

    res.json({ ok: true, result });
  } catch (err) {
    console.error('[qualityOperational]', err?.message || err);
    res.status(500).json({ ok: false, error: err?.message || 'internal_error' });
  }
});

module.exports = router;
