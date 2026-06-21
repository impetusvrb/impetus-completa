'use strict';

const express = require('express');
const router = express.Router();

const flags = require('../../domains/quality/runtime/qualityModuleFlags');
const { resolveQualityRuntime } = require('../../domains/quality/runtime/qualityRuntimeResolver');
const { ensureQualitySummarizationHooks } = require('../../domains/quality/runtime/qualityBootstrap');
const wf = require('../../domains/quality/workflows/qualityDynamicWorkflowEngine');
const db = require('../../db');
const audit = require('../../domains/quality/audit/qualityImmutableAuditService');
const hooks = require('../../domains/quality/events/qualityOperationalAiHooks');
const { publishQualityIndustrialEvent } = require('../../domains/quality/events/qualityEventPublisher');

function _safe(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      console.error('[QUALITY_UNIVERSAL_RUNTIME]', err?.message || err);
      res.status(500).json({ ok: false, error: err?.message || 'Internal error' });
    }
  };
}

function _company(req, _body) {
  return req.user?.company_id || null;
}

router.get(
  '/health',
  _safe(async (_req, res) => {
    const reg = ensureQualitySummarizationHooks();
    res.json({
      ok: true,
      module_enabled: flags.isQualityUniversalRuntimeEnabled(),
      shadow_mode: flags.isQualityUniversalShadowMode(),
      summarization_hooks: reg,
      timestamp: new Date().toISOString()
    });
  })
);

router.post(
  '/runtime/resolve',
  _safe(async (req, res) => {
    const companyId = _company(req, req.body);
    const resolved = await resolveQualityRuntime({
      companyId,
      user: req.user || req.body?.user,
      functionalArea: req.body?.functional_area,
      clientHints: req.body?.client_hints
    });
    res.json({ ok: true, resolved });
  })
);

router.get(
  '/workflows/definitions',
  _safe(async (req, res) => {
    const companyId = _company(req, req.query);
    if (!companyId || !/^[0-9a-f-]{36}$/i.test(companyId)) {
      return res.status(400).json({ ok: false, error: 'company_id UUID requerido' });
    }
    const r = await db.query(
      `SELECT id, workflow_key, kind, active, company_id IS NULL AS is_platform
       FROM impetus_quality_workflow_definition
       WHERE active = true AND (company_id IS NULL OR company_id = $1)
       ORDER BY workflow_key`,
      [companyId]
    );
    res.json({ ok: true, definitions: r.rows });
  })
);

router.get(
  '/field-schemas',
  _safe(async (req, res) => {
    const companyId = _company(req, req.query);
    if (!companyId || !/^[0-9a-f-]{36}$/i.test(companyId)) {
      return res.status(400).json({ ok: false, error: 'company_id UUID requerido' });
    }
    const r = await db.query(
      `SELECT schema_key, version, active, company_id IS NULL AS is_platform
       FROM impetus_quality_field_catalog
       WHERE active = true AND (company_id IS NULL OR company_id = $1)
       ORDER BY schema_key, version DESC`,
      [companyId]
    );
    res.json({ ok: true, schemas: r.rows });
  })
);

router.post(
  '/workflows/instance',
  _safe(async (req, res) => {
    const companyId = _company(req, req.body);
    if (!companyId || !/^[0-9a-f-]{36}$/i.test(companyId)) {
      return res.status(400).json({ ok: false, error: 'company_id UUID requerido' });
    }
    const body = req.body || {};
    const out = await wf.createWorkflowInstance(companyId, body.workflow_key, {
      correlation_id: body.correlation_id,
      idempotency_key: body.idempotency_key,
      trace_id: body.trace_id,
      context: body.context
    });
    res.json({ ok: true, ...out });
  })
);

router.post(
  '/workflows/transition',
  _safe(async (req, res) => {
    const companyId = _company(req, req.body);
    if (!companyId || !/^[0-9a-f-]{36}$/i.test(companyId)) {
      return res.status(400).json({ ok: false, error: 'company_id UUID requerido' });
    }
    const body = req.body || {};
    const out = await wf.transitionWorkflowInstance(companyId, body.instance_id, body.action, {
      patch: body.context_patch,
      payload: body.payload,
      origin_layer: body.origin_layer,
      intended_audience: body.intended_audience,
      user_id: req.user?.id,
      causation_id: body.causation_id
    });
    res.json({ ok: true, ...out });
  })
);

router.post(
  '/hooks/operational',
  _safe(async (req, res) => {
    const companyId = _company(req, req.body);
    if (!companyId || !/^[0-9a-f-]{36}$/i.test(companyId)) {
      return res.status(400).json({ ok: false, error: 'company_id UUID requerido' });
    }
    const body = req.body || {};
    const result = await hooks.publishOperationalHook(body.hook, companyId, body.payload || {}, {
      correlation_id: body.correlation_id,
      trace_id: body.trace_id,
      workflow_id: body.workflow_id,
      intended_audience: body.intended_audience,
      user_id: req.user?.id,
      idempotency_key: body.idempotency_key
    });
    res.json({ ok: true, result });
  })
);

router.post(
  '/events/publish',
  _safe(async (req, res) => {
    const companyId = _company(req, req.body);
    if (!companyId || !/^[0-9a-f-]{36}$/i.test(companyId)) {
      return res.status(400).json({ ok: false, error: 'company_id UUID requerido' });
    }
    const body = req.body || {};
    const result = await publishQualityIndustrialEvent(
      {
        event_name: body.event_name,
        company_id: companyId,
        correlation_id: body.correlation_id,
        causation_id: body.causation_id,
        trace_id: body.trace_id,
        workflow_id: body.workflow_id,
        idempotency_key: body.idempotency_key,
        payload: body.payload || {},
        occurred_at: body.occurred_at
      },
      {
        origin_layer: body.origin_layer || 'operational',
        intended_audience: body.intended_audience || 'analyst',
        user_id: req.user?.id
      }
    );
    res.json({ ok: true, result });
  })
);

router.get(
  '/audit/verify-chain',
  _safe(async (req, res) => {
    const companyId = _company(req, req.query);
    if (!companyId || !/^[0-9a-f-]{36}$/i.test(companyId)) {
      return res.status(400).json({ ok: false, error: 'company_id UUID requerido' });
    }
    const limit = parseInt(req.query?.limit || '500', 10);
    const v = await audit.verifyCompanyChain(companyId, limit);
    res.json({ ok: true, verification: v });
  })
);

module.exports = router;
