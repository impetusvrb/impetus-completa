'use strict';

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

router.post('/', requireAuth, express.json({ limit: '16mb' }), async (req, res) => {
  if (!client) {
    return res.status(503).json({ error: 'API Vision não configurada (ANTHROPIC_API_KEY)' });
  }

  const { system, messages, max_tokens = 1500 } = req.body;
  if (!system || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'system e messages são obrigatórios' });
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens,
      system,
      messages
    });
    res.json(response);
  } catch (err) {
    const msg = err?.message || String(err);
    console.warn('[VISION]', msg.slice(0, 200));
    res.status(500).json({ error: msg });
  }
});

module.exports = router;
