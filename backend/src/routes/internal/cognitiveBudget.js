'use strict';

/**
 * Rotas internas — WAVE 4 Safe Cognitive Context.
 */

const express = require('express');
const router = express.Router();
const runtime = require('../../cognitiveBudget/cognitiveBudgetRuntime');

function _safe(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      console.error('[COGNITIVE_BUDGET_ROUTE]', err?.message || err);
      res.status(500).json({ ok: false, error: err?.message || 'Internal error' });
    }
  };
}

router.get(
  '/health',
  _safe(async (_req, res) => {
    res.json({ ok: true, ...runtime.getHealth(), timestamp: new Date().toISOString() });
  })
);

router.post(
  '/budget/resolve',
  _safe(async (req, res) => {
    const b = await runtime.budget.resolveBudget(req.body || {});
    res.json({ ok: true, ...b });
  })
);

router.post(
  '/budget/apply',
  _safe(async (req, res) => {
    const body = req.body || {};
    const r = await runtime.budget.applyBudgetToText(body.text || '', body);
    res.json({ ok: true, ...r });
  })
);

router.post(
  '/summarize',
  _safe(async (req, res) => {
    const body = req.body || {};
    const r = await runtime.summarizer.summarizeContextBlock(body.block || '', body, {
      mode: body.mode
    });
    res.json({ ok: true, ...r });
  })
);

router.post(
  '/compress',
  _safe(async (req, res) => {
    const r = runtime.factCompression.compressBlockToFacts(req.body?.block || '');
    res.json({ ok: true, ...r });
  })
);

router.post(
  '/autoloop/check',
  _safe(async (req, res) => {
    const r = runtime.autoloop.checkInvocation(req.body || {});
    res.json({ ok: true, ...r });
  })
);

router.get(
  '/token-governance',
  _safe(async (_req, res) => {
    res.json({ ok: true, ...runtime.tokenGov.getGovernanceSnapshot() });
  })
);

router.post(
  '/pipeline/memory-block',
  _safe(async (req, res) => {
    const body = req.body || {};
    const r = await runtime.safePipeline.applyMemoryBlockBudget({
      block: body.block,
      meta: body.meta,
      companyId: body.companyId || body.company_id,
      userId: body.userId || body.user_id,
      persona: body.persona,
      domain: body.domain,
      module: body.module,
      conversationId: body.conversationId || body.conversation_id
    });
    res.json({ ok: true, ...r });
  })
);

module.exports = router;
