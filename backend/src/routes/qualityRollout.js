'use strict';

/**
 * Quality — Controlled Enterprise Rollout API (tenant-auth).
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const flags = require('../domains/quality/rollout/flags/qualityRolloutRuntimeFlags');
const { runRolloutAssessmentPack } = require('../domains/quality/rollout/runtime/qualityRolloutApiFacade');
const mem = require('../domains/quality/rollout/runtime/qualityRolloutMemoryStore');

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    rollout_enabled: flags.isQualityRolloutRuntimeEnabled(),
    flags: flags.getRolloutRuntimeFlagSnapshot(),
    assistive_only: true
  });
});

router.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (!flags.isQualityRolloutRuntimeEnabled()) {
    return res.status(503).json({ ok: false, code: 'QUALITY_ROLLOUT_OFF' });
  }
  next();
});

router.get('/snapshot/memory', (req, res) => {
  try {
    const user = req.user;
    const companyId = user?.company_id;
    if (!companyId || !/^[0-9a-f-]{36}$/i.test(String(companyId))) {
      return res.status(403).json({ ok: false, error: 'company_required' });
    }
    res.json({ ok: true, state: mem.getTenantRolloutState(companyId) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'internal_error' });
  }
});

router.post('/assessment/run', async (req, res) => {
  try {
    const user = req.user;
    const companyId = user?.company_id;
    if (!companyId || !/^[0-9a-f-]{36}$/i.test(String(companyId))) {
      return res.status(403).json({ ok: false, error: 'company_required' });
    }
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const snapshot = body.snapshot && typeof body.snapshot === 'object' ? body.snapshot : body;
    const pack = await runRolloutAssessmentPack(companyId, user?.id, snapshot, {
      correlation_id: body.correlation_id || uuidv4(),
      emit_events: body.emit_events !== false,
      persist_state: body.persist_state === true,
      persona: body.persona,
      saturation: body.saturation_opts,
      activation_confidence_threshold: body.activation_confidence_threshold
    });
    if (pack.skipped && pack.reason === 'throttled') {
      return res.status(429).json({ ok: false, code: 'ROLLOUT_THROTTLED', pack });
    }
    res.json({ ok: true, pack });
  } catch (err) {
    console.error('[qualityRollout/assessment/run]', err?.message || err);
    res.status(500).json({ ok: false, error: err?.message || 'internal_error' });
  }
});

module.exports = router;
