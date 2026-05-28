'use strict';

const express = require('express');
const router = express.Router();

const flags = require('../runtime-z-operational-nervous-system/config/sz4FeatureFlags');
const facade = require('../runtime-z-operational-nervous-system/facade/zOperationalNervousSystemFacade');
const store = require('../runtime-z-operational-nervous-system/_core/sz4TenantStore');
const metrics = require('../runtime-z-operational-nervous-system/observability/operationalNervousSystemMetrics');

function _ensureApi(req, res, next) {
  if (!flags.isApiEnabled()) {
    return res.status(503).json({ ok: false, code: 'SZ4_API_DISABLED', message: 'Runtime Z Operational Nervous System API disabled' });
  }
  if (!req.user) return res.status(401).json({ ok: false, code: 'AUTH_REQUIRED' });
  return next();
}

function _ctx(req) {
  return {
    tenant_id: req.user?.company_id || null,
    profile: req.user?.role_code || req.user?.role || null,
    message: req.query.message || req.body?.message || '',
    thread_id: req.query.thread_id || req.body?.thread_id || req.body?.conversationId || null
  };
}

router.get('/health', _ensureApi, (req, res) => {
  let persistence = null;
  try {
    const sz4p = require('../runtime-z-operational-nervous-system/persistence/sz4PersistenceRuntime');
    persistence = {
      active_for_tenant: sz4p.isActiveForTenant(req.user.company_id),
      health: sz4p.getHealth(),
    };
  } catch (_) { /* optional */ }
  res.json({
    ok: true,
    runtime: 'runtime-z-operational-nervous-system',
    phase: 'SZ4',
    stage: facade.resolveStage(req.user.company_id),
    persistence_enabled: flags.isPersistenceEnabled(),
    persistence,
    invariants: flags.invariants
  });
});

router.get('/persistence/health', _ensureApi, (req, res) => {
  try {
    const sz4p = require('../runtime-z-operational-nervous-system/persistence/sz4PersistenceRuntime');
    res.json({
      ok: true,
      tenant_id: req.user.company_id,
      active_for_tenant: sz4p.isActiveForTenant(req.user.company_id),
      health: sz4p.getHealth(),
      assistive_only: true,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message });
  }
});

router.get('/continuity', _ensureApi, (req, res) => {
  const tid = req.user.company_id;
  const threadId = req.query.thread_id || null;
  const cont = require('../runtime-z-operational-nervous-system/pipeline/operationalPipelineContinuityRuntime');
  res.json({
    ok: true,
    continuity: threadId ? cont.buildContinuity(tid, threadId) : { threads: store.listWorkflows(tid).length },
    assistive_only: true
  });
});

router.get('/tasks', _ensureApi, (req, res) => {
  res.json({ ok: true, tasks: store.listTasks(req.user.company_id, req.query.thread_id || null), assistive_only: true });
});

router.get('/workflows', _ensureApi, (req, res) => {
  res.json({ ok: true, workflows: store.listWorkflows(req.user.company_id, req.query.thread_id || null), assistive_only: true });
});

router.get('/reminders', _ensureApi, (req, res) => {
  res.json({ ok: true, reminders: store.listReminders(req.user.company_id, req.query.thread_id || null), assistive_only: true });
});

router.get('/awareness', _ensureApi, (req, res) => {
  const events = store.recentEvents(req.user.company_id, 40).filter((e) =>
    ['SILENCE_DETECTED', 'DELAY_DETECTED', 'OPERATIONAL_RISK_INFERRED', 'EXECUTIVE_RELEVANCE_DETECTED'].includes(e.type)
  );
  res.json({ ok: true, awareness: { signals: events }, assistive_only: true });
});

router.get('/observation', _ensureApi, (req, res) => {
  const obs = require('../runtime-z-operational-nervous-system/observation/selectiveContinuousObservationRuntime');
  const text = String(req.query.message || '');
  res.json({
    ok: true,
    observation: obs.shouldObserve(text, { conversationId: req.query.thread_id, sourceType: 'api' }),
    budget_per_hour: flags.observationBudgetPerHour()
  });
});

router.get('/reintegration', _ensureApi, (req, res) => {
  res.json({
    ok: true,
    reintegration: {
      enabled: flags.isReintegrationEnabled(),
      thread_aware: true,
      approval_required: true,
      auto_execution: false
    }
  });
});

router.get('/governance', _ensureApi, (req, res) => {
  res.json({
    ok: true,
    governance: facade.evaluateGovernance({
      stage: facade.resolveStage(req.user.company_id).stage,
      tasks: store.listTasks(req.user.company_id),
      workflows: store.listWorkflows(req.user.company_id)
    }),
    invariants: flags.invariants
  });
});

router.get('/metrics', _ensureApi, (req, res) => {
  res.json({ ok: true, metrics: metrics.snapshot(req.user.company_id) });
});

router.post('/validate', _ensureApi, async (req, res) => {
  try {
    const out = await facade.validateHumanAction(req.user, req.body || {});
    res.json({ ok: true, ...out });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message });
  }
});

router.post('/apply', _ensureApi, async (req, res) => {
  try {
    const ctx = _ctx(req);
    const out = await facade.processMessage({
      user: req.user,
      companyId: req.user.company_id,
      content: ctx.message,
      conversationId: ctx.thread_id,
      sourceType: req.body?.sourceType || 'api',
      io: req.app.get('io') || null
    });
    res.json({ ok: true, result: out, assistive_only: true, auto_execution: false });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message });
  }
});

module.exports = router;
