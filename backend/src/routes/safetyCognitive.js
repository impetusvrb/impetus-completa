'use strict';

const express = require('express');
const router = express.Router();
const flags = require('../domains/safety/cognitive/safetyCognitiveRuntimeFlags');

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    domain: 'safety',
    cognitive_enabled: flags.isSafetyCognitiveRuntimeEnabled()
  });
});

router.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (!flags.isSafetyCognitiveRuntimeEnabled()) {
    return res.status(503).json({ ok: false, code: 'SAFETY_COGNITIVE_OFF' });
  }
  next();
});

router.post('/insight-pack', (req, res) => {
  res.json({
    ok: true,
    pack: {
      bounded: true,
      narrative: 'SST cognitive runtime — insight pack assistivo (shadow-ready).',
      signals: req.body?.signals || {}
    }
  });
});

module.exports = router;
