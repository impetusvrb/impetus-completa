'use strict';

const express = require('express');
const router = express.Router();
const ocl = require('../compatibility/operationalCompatibilityLayer');
const wmsFlags = require('../shared/wmsFeatureFlags');
const { getOclObservabilitySnapshot } = require('../compatibility/oclObservability');
const { snapshotRoutingPolicy } = require('../compatibility/routingPolicy');
const integrationContracts = require('../shared/integrationContracts');
const { WMS_RBAC_PROFILES } = require('../shared/wmsRbacDefinitions');
const { WMS_TABLE_NAMES } = require('../core/wmsEntityRegistry');
const wmsV1Routes = require('./wmsV1Routes');

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    status: 'operational',
    phase: 'WMS-003',
    domain: 'logistics-operational',
    ocl: true,
    operational_apis: true,
    flags: wmsFlags.snapshot(),
    routing: snapshotRoutingPolicy(),
    tables: WMS_TABLE_NAMES.length,
    production_enabled: false,
    menu_visible: false
  });
});

router.get('/flags', (req, res) => {
  res.json({ ok: true, ...wmsFlags.snapshot() });
});

router.get('/rbac', (req, res) => {
  res.json({ ok: true, phase: 'WMS-003', profiles: WMS_RBAC_PROFILES, permissions_defined: true });
});

router.get('/integrations', (req, res) => {
  res.json({ ok: true, contracts: integrationContracts, active: false });
});

router.get('/ocl/observability', (req, res) => {
  res.json({ ok: true, entries: getOclObservabilitySnapshot(100) });
});

router.get('/migration/stats', async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(403).json({ ok: false, error: 'tenant required' });
    const stats = await ocl.getMigrationStats(companyId);
    res.json({ ok: true, phase: 'WMS-003', ...stats });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** WMS-003 — Operational APIs v1 (OCL-only controllers) */
router.use('/v1', wmsV1Routes);

module.exports = router;
