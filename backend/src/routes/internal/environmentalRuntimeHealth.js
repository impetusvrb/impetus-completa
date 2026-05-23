'use strict';

const express = require('express');
const router = express.Router();
const lv = require('../../cognitiveRuntime/domains/environmental/liveValidation/environmentalLiveValidationFacade');

function governanceRoleOk(user) {
  const role = String(user?.role || '').toLowerCase();
  return ['admin', 'internal_admin', 'super_admin', 'observability_admin'].includes(role) || user?.is_internal_admin;
}

router.use((req, res, next) => {
  if (!governanceRoleOk(req.user)) return res.status(403).json({ ok: false, error: 'Acesso restrito.' });
  next();
});

router.get('/status', (req, res) => {
  res.json({ ok: true, health: 'environmental_runtime', ...lv.getEnvironmentalLiveValidationStatus?.() });
});
router.get('/cockpit', async (req, res) => {
  const r = await lv.runEnvironmentalLiveValidation(req.user, req.body?.payload || {}, { force_environmental_live_validation: true }, { consolidated: req.body?.consolidated });
  res.json({ ok: true, environmental_live_validation: r.environmental_live_validation });
});
router.get('/report', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const r = await lv.runEnvironmentalLiveValidation(req.user, req.body?.payload || {}, { force_environmental_live_validation: true }, { consolidated: req.body?.consolidated });
  res.json({ ok: true, ...r });
});

module.exports = router;
