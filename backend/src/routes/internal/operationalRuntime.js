'use strict';

/**
 * Rotas internas do Operational Runtime (Fases 1-12 — Plano Mestre Final)
 * Acesso restrito: apenas admin / monitor / debug.
 */

const express = require('express');
const router = express.Router();

function _safe(fn) {
  return async (req, res) => {
    try { await fn(req, res); } catch (err) {
      console.error('[OPERATIONAL_RUNTIME_ROUTE]', err?.message || err);
      res.status(500).json({ ok: false, error: err?.message || 'Internal error' });
    }
  };
}

router.get('/health', _safe(async (_req, res) => {
  const services = {};

  const modules = [
    ['memoryBinding', './../../services/operational/operationalMemoryBindingService'],
    ['ingestion', './../../services/operational/unifiedOperationalIngestionService'],
    ['taskOrchestrator', './../../services/operational/cognitiveTaskOrchestrator'],
    ['toolRegistry', './../../services/operational/operationalToolRegistry'],
    ['documentRuntime', './../../services/operational/documentOperationalRuntime'],
    ['assistance', './../../services/operational/operationalAssistanceRuntime'],
    ['executiveExperience', './../../services/operational/executiveExperienceService'],
    ['densityAdapters', './../../services/operational/operationalDensityAdapters'],
    ['explainability', './../../services/operational/explainabilityService'],
    ['continuousLearning', './../../services/operational/continuousLearningService'],
    ['observability', './../../services/operational/enterpriseObservabilityRuntime'],
    ['unifiedPipeline', './../../services/operational/unifiedOperationalPipeline']
  ];

  for (const [name, path] of modules) {
    try {
      const mod = require(path);
      services[name] = {
        loaded: true,
        enabled: typeof mod.isEnabled === 'function' ? mod.isEnabled() : true
      };
      if (typeof mod.isShadowMode === 'function') {
        services[name].shadowMode = mod.isShadowMode();
      }
    } catch (err) {
      services[name] = { loaded: false, error: err.message };
    }
  }

  res.json({ ok: true, services, timestamp: new Date().toISOString() });
}));

router.get('/pipeline/health', _safe(async (_req, res) => {
  const pipeline = require('../../services/operational/unifiedOperationalPipeline');
  res.json(pipeline.getHealth());
}));

router.get('/adapters/status', _safe(async (_req, res) => {
  const adapters = require('../../services/operational/operationalDensityAdapters');
  res.json({ ok: true, adapters: adapters.getAdapterStatuses() });
}));

router.get('/observability/traces', _safe(async (req, res) => {
  const obs = require('../../services/operational/enterpriseObservabilityRuntime');
  const limit = parseInt(req.query?.limit || '50', 10);
  res.json({ ok: true, traces: obs.getRecentTraces(limit) });
}));

router.get('/observability/metrics', _safe(async (_req, res) => {
  const obs = require('../../services/operational/enterpriseObservabilityRuntime');
  res.json({ ok: true, metrics: obs.getMetrics() });
}));

router.get('/learning/insights', _safe(async (req, res) => {
  const learning = require('../../services/operational/continuousLearningService');
  const companyId = req.query?.companyId;
  if (!companyId) return res.status(400).json({ ok: false, error: 'companyId required' });
  res.json({ ok: true, insights: learning.getLearningInsights(companyId) });
}));

router.get('/tools/audit', _safe(async (_req, res) => {
  const tools = require('../../services/operational/operationalToolRegistry');
  res.json({ ok: true, audit: tools.getAuditLog() });
}));

router.post('/pipeline/process', _safe(async (req, res) => {
  const pipeline = require('../../services/operational/unifiedOperationalPipeline');
  const result = await pipeline.processInteraction(req.body);
  res.json(result);
}));

router.post('/learning/feedback', _safe(async (req, res) => {
  const learning = require('../../services/operational/continuousLearningService');
  const result = learning.recordFeedback(req.body);
  res.json(result);
}));

module.exports = router;
