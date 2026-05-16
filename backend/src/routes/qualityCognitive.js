'use strict';

/**
 * Quality — Cognitive Industrial Intelligence API (tenant-auth).
 * Flag mestra: IMPETUS_QUALITY_COGNITIVE_RUNTIME_ENABLED
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const flags = require('../domains/quality/cognitive/flags/qualityCognitiveRuntimeFlags');
const { runCognitiveQualityPack } = require('../domains/quality/cognitive/runtime/qualityCognitiveApiFacade');

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    cognitive_enabled: flags.isQualityCognitiveRuntimeEnabled(),
    flags: flags.getCognitiveRuntimeFlagSnapshot(),
    assistive_only: true,
    no_authority: true
  });
});

router.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (!flags.isQualityCognitiveRuntimeEnabled()) {
    return res.status(503).json({ ok: false, code: 'QUALITY_COGNITIVE_OFF' });
  }
  next();
});

router.post('/insights/run', async (req, res) => {
  try {
    const user = req.user;
    const companyId = user?.company_id;
    if (!companyId || !/^[0-9a-f-]{36}$/i.test(String(companyId))) {
      return res.status(403).json({ ok: false, error: 'company_required' });
    }
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const signals = body.signals && typeof body.signals === 'object' ? body.signals : body;
    const correlation_id = body.correlation_id || signals.correlation_id || uuidv4();
    const emit_events = body.emit_events !== false;

    const pack = await runCognitiveQualityPack(companyId, user?.id, signals, {
      correlation_id,
      emit_events,
      drift: body.drift,
      recurrence: body.recurrence,
      supplier: body.supplier,
      anomaly: body.anomaly,
      deterioration: body.deterioration,
      persona: body.persona
    });

    if (pack.skipped && pack.throttle) {
      return res.status(429).json({ ok: false, code: 'COGNITIVE_THROTTLED', ...pack });
    }
    res.json({ ok: true, pack });
  } catch (err) {
    console.error('[qualityCognitive/insights/run]', err?.message || err);
    res.status(500).json({ ok: false, error: err?.message || 'internal_error' });
  }
});

module.exports = router;
