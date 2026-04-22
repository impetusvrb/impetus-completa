'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Anthropic = require('@anthropic-ai/sdk');
const { requireAuth } = require('../middleware/auth');
const aiAnalytics = require('../services/aiAnalyticsService');

const router = express.Router();
const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

router.post('/', requireAuth, express.json({ limit: '16mb' }), async (req, res) => {
  if (!client) {
    return res.status(503).json({ error: 'API Vision não configurada (ANTHROPIC_API_KEY)' });
  }
  if (!req.user?.company_id) {
    return res.status(400).json({ error: 'Empresa não identificada.' });
  }

  const { system, messages, max_tokens = 1500 } = req.body;
  if (!system || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'system e messages são obrigatórios' });
  }

  try {
    const traceId = uuidv4();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens,
      system,
      messages
    });

    const usage = response?.usage || {};
    const inSummary = {
      system_preview: typeof system === 'string' ? system.slice(0, 4000) : '[non-string]',
      messages_meta: (Array.isArray(messages) ? messages : []).map((m) => ({
        role: m.role,
        content_len: typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content || '').length
      }))
    };
    aiAnalytics.enqueueAiTrace({
      trace_id: traceId,
      user_id: req.user.id,
      company_id: req.user.company_id,
      module_name: 'vision_api',
      input_payload: inSummary,
      output_response: {
        id: response.id,
        role: response.role,
        stop_reason: response.stop_reason,
        content_blocks: Array.isArray(response.content)
          ? response.content.map((b) => ({
              type: b.type,
              text: b.type === 'text' ? String(b.text || '').slice(0, 12000) : undefined
            }))
          : []
      },
      model_info: {
        provider: 'anthropic',
        model: response.model || 'claude-sonnet-4-20250514',
        usage,
        max_tokens
      },
      system_fingerprint: response.id ? String(response.id).slice(0, 128) : null
    });
    res.setHeader('X-AI-Trace-ID', traceId);
    res.json(response);
  } catch (err) {
    const msg = err?.message || String(err);
    console.warn('[VISION]', msg.slice(0, 200));
    res.status(500).json({ error: msg });
  }
});

module.exports = router;
