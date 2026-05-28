'use strict';

/**
 * PROMPT 24 — Action Runtime API (HITL, traces, rollback).
 * Montado em /api/action-runtime
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireHierarchy } = require('../middleware/auth');
const flags = require('../actionRuntime/config/actionRuntimeFlags');
const approvalQueue = require('../actionRuntime/hitl/approvalQueueService');
const tracer = require('../actionRuntime/execution/actionExecutionTracer');
const orchestrator = require('../actionRuntime/orchestration/actionRuntimeOrchestrator');

function _companyId(req) {
  return req.user?.company_id || null;
}

function _auditRoute(req, action, meta = {}) {
  try {
    console.info(
      '[ACTION_RUNTIME_API]',
      JSON.stringify({
        event: action,
        ts: new Date().toISOString(),
        user_id: req.user?.id,
        company_id: _companyId(req),
        mode: flags.actionRuntimeMode(),
        ...meta
      })
    );
  } catch (_e) {}
}

router.get('/health', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  const companyId = _companyId(req);
  res.json({
    ok: true,
    health: orchestrator.getHealth(),
    tenant: {
      company_id: companyId,
      pilot: flags.isPilotTenant(companyId),
      runtime_active: flags.shouldUseActionRuntime(companyId)
    }
  });
});

router.get('/approvals/pending', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = _companyId(req);
    if (!companyId) return res.status(403).json({ ok: false, error: 'Tenant required', code: 'TENANT_REQUIRED' });

    const limit = req.query.limit;
    const data = await approvalQueue.listPending(companyId, { limit });
    _auditRoute(req, 'list_pending', { count: data.count });
    res.json({ ok: true, ...data, mode: flags.actionRuntimeMode() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/approvals/:id/approve', requireAuth, requireHierarchy(4), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = _companyId(req);
    if (!companyId) return res.status(403).json({ ok: false, error: 'Tenant required', code: 'TENANT_REQUIRED' });

    if (!flags.shouldUseActionRuntime(companyId)) {
      return res.status(403).json({
        ok: false,
        error: 'Action runtime inactivo para este tenant.',
        code: 'RUNTIME_INACTIVE'
      });
    }

    const approvalId = req.params.id;
    const result = await orchestrator.approveAndExecute(approvalId, companyId, req.user.id);
    _auditRoute(req, 'approve', { approval_id: approvalId, status: result.status, ok: result.ok });

    if (!result.ok) {
      const status = result.reason === 'not_found' ? 404 : 400;
      return res.status(status).json({ ok: false, ...result });
    }
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/approvals/:id/reject', requireAuth, requireHierarchy(4), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = _companyId(req);
    if (!companyId) return res.status(403).json({ ok: false, error: 'Tenant required', code: 'TENANT_REQUIRED' });

    const approvalId = req.params.id;
    const reason = req.body?.reason || req.body?.rejection_reason || null;
    const result = await approvalQueue.reject(approvalId, companyId, req.user.id, reason);
    _auditRoute(req, 'reject', { approval_id: approvalId, ok: result.ok });

    if (!result.ok) {
      const status = result.reason === 'not_found' ? 404 : 400;
      return res.status(status).json({ ok: false, ...result });
    }
    res.json({ ok: true, status: 'rejected' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/traces', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = _companyId(req);
    if (!companyId) return res.status(403).json({ ok: false, error: 'Tenant required', code: 'TENANT_REQUIRED' });

    const items = await tracer.listTraces(companyId, {
      limit: req.query.limit,
      status: req.query.status
    });
    res.json({ ok: true, items, count: items.length, mode: flags.actionRuntimeMode() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/rollback/:traceId', requireAuth, requireHierarchy(4), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = _companyId(req);
    if (!companyId) return res.status(403).json({ ok: false, error: 'Tenant required', code: 'TENANT_REQUIRED' });

    if (!flags.allowsRealExecution()) {
      return res.status(403).json({
        ok: false,
        error: 'Rollback real requer IMPETUS_ACTION_RUNTIME_MODE=on',
        code: 'MODE_NOT_ON'
      });
    }

    const traceId = req.params.traceId;
    const result = await orchestrator.rollbackExecution(traceId, companyId, req.user.id);
    _auditRoute(req, 'rollback', { trace_id: traceId, ok: result.ok });

    if (!result.ok) {
      return res.status(400).json({ ok: false, ...result });
    }
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

module.exports = router;
