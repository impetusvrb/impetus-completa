'use strict';

const express = require('express');
const router = express.Router();

const flags = require('../runtime-z-cognitive-os/config/sz2FeatureFlags');
const facade = require('../runtime-z-cognitive-os/facade/zCognitiveOperatingSystemFacade');

function _ensureApi(req, res, next) {
  if (!flags.isApiEnabled()) {
    return res
      .status(503)
      .json({ ok: false, code: 'SZ2_API_DISABLED', message: 'Runtime Z Cognitive OS API disabled' });
  }
  if (!req.user) {
    return res.status(401).json({ ok: false, code: 'AUTH_REQUIRED' });
  }
  return next();
}

function _ctxFromReq(req) {
  return {
    tenant_id: req.user?.company_id || null,
    profile: req.user?.role_code || req.user?.role || null,
    message: req.query.message || req.body?.message || '',
    legacyHints: req.body?.legacyHints || {}
  };
}

router.get('/', _ensureApi, (req, res) => {
  const stage = facade.resolveStage(req.user.company_id);
  res.json({
    ok: true,
    runtime: 'runtime-z-cognitive-os',
    phase: 'SZ2',
    stage,
    invariants: flags.invariants
  });
});

router.get('/memory', _ensureApi, (req, res) => {
  try {
    const out = facade.applyCognitiveOperatingSystem(req.user, {}, _ctxFromReq(req));
    res.json({ ok: true, memory: out?.payload?.runtime_z_cognitive_os?.memory || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message });
  }
});

router.get('/continuity', _ensureApi, (req, res) => {
  try {
    const out = facade.applyCognitiveOperatingSystem(req.user, {}, _ctxFromReq(req));
    res.json({ ok: true, continuity: out?.payload?.runtime_z_cognitive_os?.continuity || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message });
  }
});

router.get('/reasoning', _ensureApi, (req, res) => {
  try {
    const out = facade.applyCognitiveOperatingSystem(req.user, {}, _ctxFromReq(req));
    res.json({ ok: true, reasoning: out?.payload?.runtime_z_cognitive_os?.reasoning || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message });
  }
});

router.get('/context', _ensureApi, (req, res) => {
  try {
    const out = facade.applyCognitiveOperatingSystem(req.user, {}, _ctxFromReq(req));
    res.json({ ok: true, context: out?.payload?.runtime_z_cognitive_os?.context || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message });
  }
});

router.get('/actions', _ensureApi, (req, res) => {
  try {
    const out = facade.applyCognitiveOperatingSystem(req.user, {}, _ctxFromReq(req));
    res.json({
      ok: true,
      actions: out?.payload?.runtime_z_cognitive_os?.actions || null,
      assistive_only: true,
      auto_execution: false
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message });
  }
});

router.get('/cognition', _ensureApi, (req, res) => {
  try {
    const out = facade.applyCognitiveOperatingSystem(req.user, {}, _ctxFromReq(req));
    const p = out?.payload?.runtime_z_cognitive_os || {};
    res.json({
      ok: true,
      cognition: {
        intent: p.intent,
        attention: p.attention,
        awareness: p.awareness,
        fusion: p.fusion,
        narrative: p.narrative,
        cognitive_state: p.cognitive_state
      }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message });
  }
});

router.get('/observability', _ensureApi, (_req, res) => {
  res.json({ ok: true, observability: facade.observability.snapshot() });
});

router.get('/shadow-diff', _ensureApi, (req, res) => {
  try {
    const out = facade.applyCognitiveOperatingSystem(req.user, {}, _ctxFromReq(req));
    res.json({ ok: true, shadow: out?.payload?.runtime_z_cognitive_os?.shadow || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message });
  }
});

router.get('/validation', _ensureApi, (req, res) => {
  try {
    const out = facade.applyCognitiveOperatingSystem(req.user, {}, _ctxFromReq(req));
    const p = out?.payload?.runtime_z_cognitive_os || {};
    res.json({
      ok: true,
      stage: p.stage,
      governance: p.governance,
      metrics: p.metrics,
      assistive_only: true,
      auto_execution: false,
      human_authority_preserved: true
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message });
  }
});

router.post('/apply', _ensureApi, (req, res) => {
  try {
    const out = facade.applyCognitiveOperatingSystem(req.user, req.body?.payload || {}, _ctxFromReq(req));
    res.json({ ok: out.ok !== false, stage: out.stageInfo?.stage, payload: out.payload });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message });
  }
});

router.post('/ingest/conversation', _ensureApi, (req, res) => {
  const out = facade.ingestConversationTurn(req.user.company_id, req.user, req.body || {});
  res.json({ ok: out.recorded === true, ...out });
});

router.post('/ingest/incident', _ensureApi, (req, res) => {
  const out = facade.ingestIncident(req.user.company_id, req.user, req.body || {});
  res.json({ ok: out.recorded === true, ...out });
});

router.post('/ingest/task', _ensureApi, (req, res) => {
  const out = facade.ingestTask(req.user.company_id, req.user, req.body || {});
  res.json({ ok: out.recorded === true, ...out });
});

router.post('/ingest/workflow', _ensureApi, (req, res) => {
  const out = facade.ingestWorkflow(req.user.company_id, req.user, req.body || {});
  res.json({ ok: out.recorded === true, ...out });
});

router.post('/ingest/entity', _ensureApi, (req, res) => {
  const out = facade.ingestEntity(req.user.company_id, req.user, req.body || {});
  res.json({ ok: out.recorded === true, ...out });
});

module.exports = router;
