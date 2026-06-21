'use strict';

const express = require('express');
const router = express.Router();
const correlation = require('../ecosystem-correlation');

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    layer: 'ecosystem_correlation',
    shadow_first: true,
    auto_promotion: false,
    assistive_only: true
  });
});

router.post('/pack', express.json(), (req, res) => {
  try {
    const user = req.user;
    const body = req.body || {};
    const pack = correlation.ecosystemCorrelationRuntime({
      ...body,
      tenant_id: user?.company_id,
      signals: body.signals || body
    });
    res.json(pack);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

router.post('/validate', express.json(), (req, res) => {
  try {
    const pack = correlation.ecosystemCorrelationRuntime({
      ...(req.body || {}),
      tenant_id: req.body?.tenant_id || req.user?.company_id
    });
    res.json({ ok: pack.validation?.ok, validation: pack.validation, pack });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
});

module.exports = router;
