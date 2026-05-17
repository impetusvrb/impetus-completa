'use strict';

const express = require('express');
const router = express.Router();
const flags = require('../domains/safety/runtime/safetyOperationalRuntimeFlags');

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    domain: 'safety',
    enabled: flags.isSafetyOperationalRuntimeEnabled(),
    flags: flags.getOperationalRuntimeFlagSnapshot()
  });
});

router.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (!flags.isSafetyOperationalRuntimeEnabled()) {
    return res.status(503).json({ ok: false, code: 'SAFETY_OPERATIONAL_OFF' });
  }
  next();
});

router.get('/workspace/summary', (req, res) => {
  res.json({
    ok: true,
    domain: 'safety',
    capabilities: ['inspection', 'incident', 'ptw', 'loto', 'epi', 'apr', 'ghe'],
    bounded: true
  });
});

module.exports = router;
