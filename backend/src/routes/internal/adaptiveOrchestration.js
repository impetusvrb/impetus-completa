'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../cognitiveRuntime/adaptive/adaptiveOrchestrationFacade');
const { runAdaptiveCognitiveOrchestrator } = require('../../cognitiveRuntime/adaptive/orchestration/adaptiveCognitiveOrchestrator');

function governanceRoleOk(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (['admin', 'internal_admin', 'super_admin', 'observability_admin'].includes(role)) return true;
  if (user.is_internal_admin) return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes('*') || perms.includes('GOVERNANCE_OVERSIGHT');
}

router.use((req, res, next) => {
  if (!governanceRoleOk(req.user)) return res.status(403).json({ ok: false, error: 'Acesso restrito.' });
  next();
});

function _payload(req) {
  return req.body?.payload || {};
}

router.get('/status', (req, res) => {
  res.json({ ok: true, ...facade.getAdaptiveOrchestrationStatus() });
});

router.get('/fatigue', (req, res) => {
  const report = runAdaptiveCognitiveOrchestrator(req.user, _payload(req), { force_adaptive_orchestration: true });
  res.json({ ok: true, fatigue_analysis: report.fatigue_analysis });
});

router.get('/usefulness', (req, res) => {
  const report = runAdaptiveCognitiveOrchestrator(req.user, _payload(req), { force_adaptive_orchestration: true });
  res.json({ ok: true, usefulness_analysis: report.usefulness_analysis });
});

router.get('/convergence', (req, res) => {
  const report = runAdaptiveCognitiveOrchestrator(req.user, _payload(req), { force_adaptive_orchestration: true });
  res.json({ ok: true, convergence_orchestration: report.convergence_orchestration });
});

router.get('/pressure', (req, res) => {
  const report = runAdaptiveCognitiveOrchestrator(req.user, _payload(req), { force_adaptive_orchestration: true });
  res.json({ ok: true, pressure_analysis: report.pressure_analysis });
});

router.get('/density', (req, res) => {
  const report = runAdaptiveCognitiveOrchestrator(req.user, _payload(req), { force_adaptive_orchestration: true });
  res.json({ ok: true, density_orchestration: report.density_orchestration });
});

router.get('/recommendations', (req, res) => {
  const report = runAdaptiveCognitiveOrchestrator(req.user, _payload(req), { force_adaptive_orchestration: true });
  res.json({ ok: true, recommendations: report.recommendations, adaptive_orchestration: report.adaptive_orchestration });
});

router.get('/performance', (req, res) => {
  const report = runAdaptiveCognitiveOrchestrator(req.user, _payload(req), { force_adaptive_orchestration: true });
  res.json({ ok: true, performance: report.performance });
});

router.get('/report', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const out = facade.applyAdaptiveOrchestration(req.user, _payload(req), { force_adaptive_orchestration: true });
  const report = out.report || runAdaptiveCognitiveOrchestrator(req.user, _payload(req), { force_adaptive_orchestration: true });
  res.json({ ok: true, ...report, payload_adaptive: out.adaptive_orchestration });
});

module.exports = router;
