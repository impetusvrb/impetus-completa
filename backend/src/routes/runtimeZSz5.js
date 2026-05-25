'use strict';

const express = require('express');
const router = express.Router();
const flags = require('../runtime-z-sovereign/sz5/config/sz5FeatureFlags');
const facade = require('../runtime-z-sovereign/sz5/facade/zSz5UnifiedMemoryFacade');
const queryRt = require('../runtime-z-sovereign/sz5/query/zOperationalConversationalQueryRuntime');
const memory = require('../runtime-z-sovereign/sz5/memory/zUnifiedOperationalMemoryRuntime');
const observability = require('../runtime-z-sovereign/sz5/observability/zConversationalObservabilityRuntime');
const persistence = require('../runtime-z-sovereign/sz5/persistence/zConversationIndexPersistence');
const governance = require('../runtime-z-sovereign/sz5/governance/zConversationalGovernanceRuntime');

function _ensureApi(req, res, next) {
  if (!flags.isApiEnabled()) {
    return res.status(503).json({ ok: false, code: 'SZ5_API_DISABLED' });
  }
  if (!req.user) return res.status(401).json({ ok: false, code: 'AUTH_REQUIRED' });
  const access = governance.assertChatAccess(req.user);
  if (!access.ok) return res.status(403).json({ ok: false, code: access.reason });
  return next();
}

router.get('/health', _ensureApi, (req, res) => res.json(facade.health()));

router.post('/query', _ensureApi, async (req, res) => {
  try {
    const q = String(req.body?.query || req.body?.message || '').trim();
    const out = await facade.query(req.user, q, {
      threadId: req.body?.thread_id || req.body?.conversationId || null,
      limit: parseInt(req.body?.limit || '15', 10)
    });
    res.json({ ok: true, ...out });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/memory', _ensureApi, async (req, res) => {
  const hits = await persistence.searchIndexedMessages(req.user.company_id, req.user.id, {
    thread_id: req.query.thread_id || null,
    q: req.query.q || null
  }, 40);
  res.json({ ok: true, memory: governance.filterHitsByGovernance(req.user, hits) });
});

router.get('/timeline', _ensureApi, async (req, res) => {
  const hits = await persistence.searchIndexedMessages(req.user.company_id, req.user.id, {}, 50);
  res.json({
    ok: true,
    timeline: hits.map((h) => ({
      message_id: h.message_id,
      thread_id: h.thread_id,
      indexed_at: h.indexed_at,
      workflow_type: h.index_record?.workflow_type,
      excerpt: String(h.content_snapshot || '').slice(0, 160)
    }))
  });
});

router.get('/actors', _ensureApi, async (req, res) => {
  const hits = await persistence.searchIndexedMessages(req.user.company_id, req.user.id, {
    actor_name: req.query.name || null
  }, 30);
  res.json({ ok: true, actors: hits });
});

router.get('/workflows', _ensureApi, async (req, res) => {
  const hits = await persistence.searchIndexedMessages(req.user.company_id, req.user.id, {
    workflow_type: req.query.type || null
  }, 30);
  res.json({ ok: true, workflows: hits });
});

router.get('/threads', _ensureApi, async (req, res) => {
  const ids = await governance.userAccessibleThreadIds(req.user);
  res.json({ ok: true, threads: ids });
});

router.get('/followups', _ensureApi, async (req, res) => {
  const hits = await persistence.searchIndexedMessages(req.user.company_id, req.user.id, {
    workflow_type: 'followup'
  }, 25);
  res.json({ ok: true, followups: hits });
});

router.get('/meetings', _ensureApi, async (req, res) => {
  const hits = await persistence.searchIndexedMessages(req.user.company_id, req.user.id, {
    workflow_type: 'meeting',
    temporal: req.query.when === 'tomorrow' ? 'tomorrow' : null
  }, 25);
  res.json({ ok: true, meetings: hits });
});

router.get('/tasks', _ensureApi, async (req, res) => {
  const hits = await persistence.searchIndexedMessages(req.user.company_id, req.user.id, {
    workflow_type: 'task'
  }, 25);
  res.json({ ok: true, tasks: hits });
});

router.get('/continuity', _ensureApi, async (req, res) => {
  const q = await queryRt.queryOperationalConversation(req.user, req.query.message || 'continuidade', {
    threadId: req.query.thread_id || null
  });
  res.json({ ok: true, continuity: q });
});

router.get('/graph', _ensureApi, async (req, res) => {
  const g = await memory.getGraphSnapshot(req.user.company_id, req.user.id);
  res.json({ ok: true, graph: g });
});

router.get('/observability', _ensureApi, (req, res) => {
  res.json({ ok: true, metrics: observability.snapshot() });
});

module.exports = router;
