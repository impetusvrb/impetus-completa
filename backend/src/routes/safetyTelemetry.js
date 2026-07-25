'use strict';

const express = require('express');
const router = express.Router();
const flags = require('../domains/safety/telemetry/safetyTelemetryRuntimeFlags');

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    domain: 'safety',
    telemetry_enabled: flags.isSafetyTelemetryRuntimeEnabled()
  });
});

router.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (!flags.isSafetyTelemetryRuntimeEnabled()) {
    return res.status(503).json({ ok: false, code: 'SAFETY_TELEMETRY_OFF' });
  }
  next();
});

router.get('/snapshot', (req, res) => {
  res.json({
    ok: false,
    status: 'not_configured',
    code: 'SAFETY_TELEMETRY_SOURCE_NOT_CONFIGURED',
    domain: 'safety',
    metrics: {
      navigation_samples: null,
      publication_denied: null
    }
  });
});

module.exports = router;
