'use strict';

const express = require('express');
const router = express.Router();
const facade = require('../../cognitiveRuntime/adaptive/adaptiveOrchestrationFacade');
const { validateAdaptiveOrchestrationReport } = require('../../cognitiveRuntime/adaptive/validation/adaptiveOrchestrationValidator');

function governanceRoleOk(user) {
  const role = String(user?.role || '').toLowerCase();
  return ['admin', 'internal_admin', 'super_admin', 'observability_admin'].includes(role) || user?.is_internal_admin;
}

router.use((req, res, next) => {
  if (!governanceRoleOk(req.user)) return res.status(403).json({ ok: false, error: 'Acesso restrito.' });
  next();
});

router.get('/status', (req, res) => res.json({ ok: true, health: 'orchestration', ...facade.getAdaptiveOrchestrationStatus() }));
router.get('/report', (req, res) => {
  const out = facade.applyAdaptiveOrchestration(req.user, req.body?.payload || {}, { force_adaptive_orchestration: true });
  const validation = validateAdaptiveOrchestrationReport(out.report || out.adaptive_orchestration);
  res.json({ ok: true, adaptive_orchestration: out.adaptive_orchestration, validation });
});

module.exports = router;
