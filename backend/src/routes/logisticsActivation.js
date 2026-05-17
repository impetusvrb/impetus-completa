'use strict';

const express = require('express');
const router = express.Router();
const health = require('../domains/logistics/activation/logisticsPublicationHealthService');
const rollout = require('../domains/logistics/activation/logisticsActivationRolloutEngine');
const flags = require('../domains/logistics/navigation/logisticsNavigationFlags');

router.get('/health', (req, res) => {
  res.json({ ok: true, domain: 'logistics', assistive_only: true });
});

router.get('/readiness', (req, res) => {
  try {
    const checks = health.runSafeActivationChecks({
      tenantId: req.user?.company_id,
      hasLogisticsIntelligenceModule: true
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
