'use strict';

const express = require('express');
const router = express.Router();
const supplyFlags = require('../shared/supplyFeatureFlags');
const { SUPPLY_RBAC_PROFILES } = require('../shared/supplyRbacDefinitions');
const { getSupplyRuntimeRegistryEntry } = require('../registry/supplyRuntimeRegistry');
const { listContractTypes, CONTRACT_VERSION } = require('../contracts/interfaces');
const supplyV1Routes = require('./supplyV1Routes');

router.get('/health', (req, res) => {
  const registry = getSupplyRuntimeRegistryEntry();
  res.json({
    ok: true,
    status: 'homologation_ready',
    phase: 'GF-027',
    domain: 'supply',
    runtime_id: 'supply_native',
    flags: supplyFlags.snapshot(),
    registry,
    contracts: { version: CONTRACT_VERSION, types: listContractTypes() },
    production_enabled: false,
    menu_published: false,
    homologation: 'COMPLETE'
  });
});

router.get('/flags', (req, res) => {
  res.json({ ok: true, ...supplyFlags.snapshot() });
});

router.get('/rbac', (req, res) => {
  res.json({ ok: true, phase: 'GF-027', profiles: SUPPLY_RBAC_PROFILES, permissions_defined: true });
});

router.use('/v1', supplyV1Routes);

module.exports = router;
