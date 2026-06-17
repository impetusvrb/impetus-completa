'use strict';

/**
 * M1.6 — Production Domain Operational Validation Routes
 *
 * READ ONLY · GET only · No mutations
 * AIOI · Truth Program · P0A–P0E · TRI-AI preserved
 */

const express = require('express');
const router = express.Router();
const svc = require('../services/audit/productionDomainValidationService');

function asyncWrap(fn) {
  return (req, res) => {
    fn(req, res).catch((err) => {
      console.error('[m1Validation]', err?.message ?? err);
      res.status(500).json({ ok: false, error: err?.message ?? 'Internal error', phase: 'M1.6' });
    });
  };
}

/**
 * GET /api/m1/validation/status
 * Consolidated production domain validation (all domains)
 */
router.get('/status', asyncWrap(async (_req, res) => {
  const result = await svc.consolidatedValidation();
  res.json({ ok: true, phase: 'M1.6', ...result });
}));

/**
 * GET /api/m1/validation/safety
 */
router.get('/safety', asyncWrap(async (_req, res) => {
  const result = await svc.validateSafety();
  res.json({ ok: true, ...result });
}));

/**
 * GET /api/m1/validation/environment
 */
router.get('/environment', asyncWrap(async (_req, res) => {
  const result = await svc.validateEnvironment();
  res.json({ ok: true, ...result });
}));

/**
 * GET /api/m1/validation/executive
 */
router.get('/executive', asyncWrap(async (_req, res) => {
  const result = await svc.validateExecutive();
  res.json({ ok: true, ...result });
}));

/**
 * GET /api/m1/validation/maintenance
 */
router.get('/maintenance', asyncWrap(async (_req, res) => {
  const result = await svc.validateMaintenance();
  res.json({ ok: true, ...result });
}));

/**
 * GET /api/m1/validation/hr
 */
router.get('/hr', asyncWrap(async (_req, res) => {
  const result = await svc.validateHR();
  res.json({ ok: true, ...result });
}));

/**
 * GET /api/m1/validation/financial
 */
router.get('/financial', asyncWrap(async (_req, res) => {
  const result = await svc.validateFinancial();
  res.json({ ok: true, ...result });
}));

module.exports = router;
