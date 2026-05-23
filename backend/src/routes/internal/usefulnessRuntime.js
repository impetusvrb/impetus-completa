'use strict';

const express = require('express');
const router = express.Router();
const { runAdaptiveCognitiveOrchestrator } = require('../../cognitiveRuntime/adaptive/orchestration/adaptiveCognitiveOrchestrator');
const facade = require('../../cognitiveRuntime/adaptive/adaptiveOrchestrationFacade');

function governanceRoleOk(user) {
  const role = String(user?.role || '').toLowerCase();
  return ['admin', 'internal_admin', 'super_admin', 'observability_admin'].includes(role) || user?.is_internal_admin;
}

router.use((req, res, next) => {
  if (!governanceRoleOk(req.user)) return res.status(403).json({ ok: false, error: 'Acesso restrito.' });
  next();
});

router.get('/status', (req, res) => res.json({ ok: true, phase: 'Z.28-usefulness', ...facade.getAdaptiveOrchestrationStatus() }));
router.get('/report', (req, res) => {
  const report = runAdaptiveCognitiveOrchestrator(req.user, req.body?.payload || {}, { force_adaptive_orchestration: true });
  res.json({ ok: true, ...report.usefulness_analysis, usefulness_score: report.adaptive_orchestration?.usefulness_score });
});

module.exports = router;
