'use strict';

/**
 * AIOI-P1J.8 — Production Readiness API (READ ONLY)
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const { requireCompanyActive } = require('../../middleware/multiTenant');

const productionReadiness = require('../../services/aioi/runtime/aioiProductionReadinessService');
const operationalRisk = require('../../services/aioi/runtime/aioiOperationalRiskService');
const certificationRegistry = require('../../services/aioi/runtime/aioiCertificationRegistryService');
const deploymentGovernance = require('../../services/aioi/runtime/aioiDeploymentGovernanceService');
const deploymentApproval = require('../../services/aioi/runtime/aioiDeploymentApprovalService');
const rolloutRegistry = require('../../services/aioi/runtime/aioiProductionRolloutRegistryService');
const continuousReadiness = require('../../services/aioi/runtime/aioiContinuousReadinessService');

const readOnlyMw = [requireAuth, requireCompanyActive];

router.get('/readiness', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(await productionReadiness.generateProductionReadiness());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/risk', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(await operationalRisk.assessOperationalRisk());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/certifications', readOnlyMw, (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(certificationRegistry.getCertificationStatus());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/audit', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(await productionReadiness.conductProductionAudit());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/deployment', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    return res.json(await deploymentGovernance.generateDeploymentGovernanceStatus());
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/approval', readOnlyMw, (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const approvalId = req.query.approval_id || null;
    return res.json(deploymentApproval.getApprovalStatus(approvalId));
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/rollouts', readOnlyMw, (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const limit = parseInt(req.query.limit || '50', 10);
    const type = req.query.type || null;
    return res.json({
      status: rolloutRegistry.getRolloutStatus(),
      history: rolloutRegistry.getRolloutHistory({ limit, type })
    });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/readiness-history', readOnlyMw, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const limit = parseInt(req.query.limit || '20', 10);
    const latest = await continuousReadiness.runContinuousReadinessCheck();
    return res.json({
      latest,
      history: continuousReadiness.getReadinessHistory({ limit })
    });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
