'use strict';

const express = require('express');
const router = express.Router();
const hardening = require('../enterprise-hardening');

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    layer: 'enterprise_hardening',
    phase: 'full_enterprise_maturity',
    shadow_first: true,
    auto_promotion: false,
    assistive_only: true
  });
});

router.post('/pack', express.json(), (req, res) => {
  try {
    const user = req.user;
    const body = req.body || {};
    const pack = hardening.enterpriseOperationalHardeningRuntime({
      ...body,
      tenant_id: user?.company_id,
      hardening_context: body.hardening_context || body
    });
    res.json(pack);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.post('/observe', express.json(), (req, res) => {
  try {
    const pack = hardening.enterpriseOperationalHardeningRuntime({
      ...(req.body || {}),
      tenant_id: req.body?.tenant_id || req.user?.company_id,
      observation_minutes: req.body?.observation_minutes || 15
    });
    res.json({
      ok: pack.ok,
      observation_cycle: pack.observation_cycle,
      validation: pack.validation,
      maturity: pack.maturity?.ecosystem
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

module.exports = router;
