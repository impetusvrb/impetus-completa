'use strict';

const express = require('express');
const router = express.Router();
const flags = require('../domains/safety/rollout/flags/safetyRolloutRuntimeFlags');
const rollout = require('../domains/safety/activation/safetyActivationRolloutEngine');

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    domain: 'safety',
    rollout_enabled: flags.isSafetyRolloutRuntimeEnabled(),
    stage: rollout.resolveActivationStage()
  });
});

router.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (!flags.isSafetyRolloutRuntimeEnabled()) {
    return res.status(503).json({ ok: false, code: 'SAFETY_ROLLOUT_OFF' });
  }
  next();
});

router.get('/progress', (req, res) => {
  const stage = rollout.resolveActivationStage();
  res.json({ ok: true, ...rollout.describeRolloutProgress(stage) });
});

module.exports = router;
