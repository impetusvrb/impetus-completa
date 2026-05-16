'use strict';

/**
 * GET /api/internal/governance/status — estado da governança de rede interna.
 */

const express = require('express');
const router = express.Router();
const governance = require('../../services/internalNetworkGovernance');
const { getInternalRouteRegistry } = require('../../middleware/internalNetworkGuard');
const shadowRouteRegistry = require('../../middleware/shadowRouteRegistry');

router.get('/status', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const network = governance.getGovernanceStatus();
  const evaluation = governance.evaluateNetworkAccess(req);

  res.json({
    ok: true,
    network_governance: network,
    caller_network: {
      ip: evaluation.network?.ip,
      source: evaluation.network?.source,
      allowed: evaluation.allowed,
      reason: evaluation.reason,
      matched_cidr: evaluation.matchedCidr || null
    },
    internal_routes: getInternalRouteRegistry(),
    shadow_routes: shadowRouteRegistry.getRegistry(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
