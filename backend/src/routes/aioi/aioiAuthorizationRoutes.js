'use strict';

/**
 * AIOI-P1M.8 — Runtime Authorization API (READ ONLY)
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireCompanyActive } = require('../../middleware/multiTenant');

const policySvc = require('../../services/aioi/runtime/aioiAuthorizationPolicyService');
const registry = require('../../services/aioi/runtime/aioiRuntimeAuthorizationRegistryService');
const auditSvc = require('../../services/aioi/runtime/aioiAuthorizationAuditService');
const authGovernance = require('../../services/aioi/runtime/aioiAuthorizationGovernanceService');

const readOnlyMw = [requireAuth, requireCompanyActive];

router.get('/policies', readOnlyMw, (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(policySvc.getAuthorizationPolicies());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/requests', readOnlyMw, (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const limit = parseInt(req.query.limit || '50', 10);
    const status = req.query.status || null;
    return res.json(registry.getAuthorizationRequests({ limit, status }));
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/history', readOnlyMw, (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const limit = parseInt(req.query.limit || '100', 10);
    const requestId = req.query.request_id || null;
    return res.json(auditSvc.getAuthorizationHistory({ limit, request_id: requestId }));
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/status', readOnlyMw, (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(authGovernance.getAuthorizationStatus());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
