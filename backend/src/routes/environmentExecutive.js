'use strict';

/**
 * Environment — Executive Cockpit API (tenant-auth).
 * Flag mestra: IMPETUS_ENVIRONMENT_EXECUTIVE_RUNTIME_ENABLED
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const flags = require('../domains/environment/executive/flags/environmentExecutiveRuntimeFlags');
const { runExecutiveEnvironmentPack } = require('../domains/environment/executive/orchestration/environmentExecutiveOrchestrator');
const validation = require('../domains/environment/executive/validation/environmentExecutiveRuntimeValidation');
const foundation = require('../domains/environment/executive/runtime/environmentExecutiveRuntime');

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    executive_enabled: flags.isEnvironmentExecutiveRuntimeEnabled(),
    flags: flags.getExecutiveRuntimeFlagSnapshot(),
    foundation: foundation.getFoundationSnapshot(),
    assistive_only: true
  });
});

router.get('/validation/run', (req, res) => {
  res.json(validation.runFullExecutiveValidation());
});

router.use((req, res, next) => {
  if (req.path === '/health' || req.path === '/validation/run') return next();
  if (!flags.isEnvironmentExecutiveRuntimeEnabled()) {
    return res.status(503).json({ ok: false, code: 'ENVIRONMENT_EXECUTIVE_OFF' });
  }
  next();
});

router.post('/cockpit/run', async (req, res) => {
  try {
    const user = req.user;
    const companyId = user?.company_id;
    if (!companyId || !/^[0-9a-f-]{36}$/i.test(String(companyId))) {
      return res.status(403).json({ ok: false, error: 'company_required' });
    }
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const pack = await runExecutiveEnvironmentPack(companyId, user?.id, body, {
      correlation_id: body.correlation_id || uuidv4(),
      emit_events: body.emit_events !== false,
      cognitive_pack: body.cognitive_pack
    });
    if (pack.skipped && pack.throttle) {
      return res.status(429).json({ ok: false, code: 'EXECUTIVE_THROTTLED', ...pack });
    }
    res.json({ ok: true, pack });
  } catch (err) {
    console.error('[environmentExecutive/cockpit/run]', err?.message || err);
    res.status(500).json({ ok: false, error: err?.message || 'internal_error' });
  }
});

module.exports = router;
