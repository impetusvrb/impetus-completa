'use strict';

const express = require('express');
const router = express.Router();
const pilot = require('../domains/environment/pilot-rollout');
const rollout = require('../domains/environment/activation/environmentActivationRolloutEngine');
const navFlags = require('../domains/environment/navigation/environmentNavigationFlags');

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    domain: 'environment',
    layer: 'pilot_rollout',
    stage: rollout.resolveActivationStage(),
    shadow: navFlags.isShadowPublication(),
    auto_promotion: false,
    assistive_only: true
  });
});

router.post('/pack', express.json(), (req, res) => {
  try {
    const user = req.user;
    const body = req.body || {};
    const pack = pilot.environmentPilotRolloutRuntime({
      ...body,
      tenant_id: user?.company_id,
      user: body.user || user,
      has_environment_intelligence: body.has_environment_intelligence !== false
    });
    res.json(pack);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.post('/validate', express.json(), (req, res) => {
  try {
    const user = req.user;
    const body = req.body || {};
    const pack = pilot.environmentPilotValidationRuntime({
      ...body,
      tenant_id: user?.company_id,
      user: body.user || user
    });
    res.json(pack);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

module.exports = router;
