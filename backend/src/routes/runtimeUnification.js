'use strict';

/**
 * PROMPT 28 — Runtime unification API
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireHierarchy } = require('../middleware/auth');
const flags = require('../runtimeUnification/config/runtimeUnificationFlags');
const channels = require('../runtimeUnification/governance/channelRegistry');
const facade = require('../runtimeUnification/facade/unifiedSz5RuntimeFacade');
const audit = require('../runtimeUnification/observability/runtimeUnificationAuditService');

router.get('/health', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    ok: true,
    health: facade.getHealth(),
    tenant: {
      company_id: req.user?.company_id,
      pilot: flags.isPilotTenant(req.user?.company_id),
      applies: flags.shouldApplyForTenant(req.user?.company_id)
    }
  });
});

router.get('/channels', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, channels: channels.listChannels(), mode: flags.unificationMode() });
});

router.get('/audit', requireAuth, requireHierarchy(3), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const items = await audit.listRecent(req.user?.company_id, req.query.limit);
    res.json({ ok: true, items, count: items.length, mode: flags.unificationMode() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/context/preview', requireAuth, requireHierarchy(3), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const channel = req.body?.channel || channels.CHANNELS.TEXT;
  const queryText = String(req.body?.query_text || req.body?.message || '').slice(0, 4000);
  try {
    const result = await facade.buildChannelContext({
      channel,
      user: req.user,
      message: queryText,
      queryText,
      conversationId: req.body?.conversation_id || null,
      callerHint: 'api_preview'
    });
    res.json({ ok: true, ...result, mode: flags.unificationMode() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

module.exports = router;
