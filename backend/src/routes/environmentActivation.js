'use strict';

const express = require('express');
const router = express.Router();
const health = require('../domains/environment/activation/environmentPublicationHealthService');
const rollout = require('../domains/environment/activation/environmentActivationRolloutEngine');
const flags = require('../domains/environment/navigation/environmentNavigationFlags');

router.get('/health', (req, res) => {
  res.json({ ok: true, domain: 'environment', assistive_only: true });
});

router.get('/readiness', (req, res) => {
  try {
    const checks = health.runSafeActivationChecks({
      tenantId: req.user?.company_id,
      hasEnvironmentIntelligenceModule: true
    });
    res.json({ ok: true, ...checks, stages: rollout.STAGES });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.get('/flags', (req, res) => {
  res.json({ ok: true, flags: flags.snapshot(), stage: rollout.resolveActivationStage() });
});

module.exports = router;
