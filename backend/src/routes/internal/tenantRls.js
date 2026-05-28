'use strict';

const express = require('express');
const router = express.Router();
const rls = require('../../tenant-isolation/runtime/tenantRlsRuntime');
const fuzz = require('../../tenant-isolation/testing/tenantFuzzSuite');
const attack = require('../../tenant-isolation/testing/crossTenantAttackSimulator');
const gov = require('../../tenant-isolation/governance/tenantRlsGovernanceService');

router.get('/health', (req, res) => {
  res.json({ ok: true, tenant_rls: gov.getDiagnostics() });
});

router.get('/registry', async (req, res) => {
  try {
    const registry = await rls.listRegistry();
    res.json({ ok: true, registry });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message });
  }
});

router.post('/fuzz/run', async (req, res) => {
  try {
    const out = await fuzz.runFullSuite(req.body || {});
    res.json(out);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message });
  }
});

router.post('/chaos/attack-simulation', async (req, res) => {
  try {
    const out = await attack.runAttackSimulation(req.body || {});
    res.json(out);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message });
  }
});

module.exports = router;
