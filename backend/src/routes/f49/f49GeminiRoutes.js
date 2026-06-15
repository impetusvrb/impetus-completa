'use strict';

/**
 * F49-D.7 — Gemini Readiness API Routes (READ ONLY)
 */

const express = require('express');
const router = express.Router();
const audit = require('../../services/audit/geminiReadinessAuditService');

router.get('/readiness', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const report = await audit.generateGeminiReadinessAudit({
      skipStress: req.query.skip_stress === '1' || req.query.skip_stress === 'true',
      skipVision: req.query.skip_vision === '1',
      stressCount: req.query.stress_count ? parseInt(req.query.stress_count, 10) : undefined
    });
    return res.json(report);
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, layer: audit.LAYER, error: err.message });
  }
});

router.get('/vision', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const config = audit.auditConfiguration();
    const vision = await audit.validateVision();
    return res.json({
      ok: true,
      layer: audit.LAYER,
      read_only: true,
      configuration: config,
      vision,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/benchmark', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const triAi = await audit.checkTriAiReadiness({ forceRefresh: true });
    return res.json({
      ok: true,
      layer: audit.LAYER,
      read_only: true,
      providers: { openai: triAi.openai, anthropic: triAi.anthropic, gemini: triAi.gemini },
      tri_ai_ready: triAi.tri_ai_ready,
      verdict: triAi.verdict,
      integrations: triAi.integrations,
      probed_at: triAi.probed_at,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/status', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const snapshot = await audit.getGeminiStatusSnapshot();
    return res.json(snapshot);
  } catch (err) {
    res.set('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
