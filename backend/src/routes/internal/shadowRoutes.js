'use strict';

/**
 * GET /api/internal/shadow-routes — registry + audit (governança shadow).
 */

const express = require('express');
const router = express.Router();
const shadowRouteRegistry = require('../../middleware/shadowRouteRegistry');

router.get('/', (_req, res) => {
  res.json({
    ok: true,
    globally_enabled: shadowRouteRegistry.shadowRoutesGloballyEnabled(),
    production: shadowRouteRegistry.isProduction(),
    routes: shadowRouteRegistry.getRegistry()
  });
});

router.get('/audit', (req, res) => {
  const limit = parseInt(req.query?.limit || '50', 10);
  res.json({
    ok: true,
    audit: shadowRouteRegistry.getAuditLog(limit)
  });
});

module.exports = router;
