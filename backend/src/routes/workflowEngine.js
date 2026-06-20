'use strict';

/**
 * PROMPT 25 — Industrial Workflow Engine API
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireHierarchy } = require('../middleware/auth');
const flags = require('../workflowEngine/config/workflowEngineFlags');
const orchestrator = require('../workflowEngine/orchestration/workflowOrchestrator');
const approvalChain = require('../workflowEngine/hitl/approvalChainService');
const graph = require('../workflowEngine/graph/executionGraphService');
const audit = require('../workflowEngine/audit/workflowAuditTracer');
const recovery = require('../workflowEngine/recovery/workflowRecoveryService');
const bpmnRegistry = require('../workflowEngine/bpmn/bpmnDefinitionRegistry');
const permissionGate = require('../workflowEngine/permission/workflowPermissionGate');

function _companyId(req) {
  return req.user?.company_id || null;
}

function _auditApi(req, action, meta = {}) {
  try {
    console.info(
      '[WORKFLOW_ENGINE_API]',
      JSON.stringify({
        event: action,
        ts: new Date().toISOString(),
        user_id: req.user?.id,
        company_id: _companyId(req),
        mode: flags.workflowEngineMode(),
        ...meta
      })
    );
  } catch (_e) {}
}

router.get('/health', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  const companyId = _companyId(req);
  const permissionGate = require('../workflowEngine/permission/workflowPermissionGate');
  res.json({
    ok: true,
    health: orchestrator.getHealth(),
    security: permissionGate.getWorkflowSecurityDiagnostics(),
    tenant: {
      company_id: companyId,
      pilot: flags.isPilotTenant(companyId),
      runtime_active: flags.shouldUseWorkflowEngine(companyId)
    }
  });
});

router.get('/definitions', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, definitions: bpmnRegistry.listDefinitions() });
});

router.post('/instances/start', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = _companyId(req);
    if (!companyId) return res.status(403).json({ ok: false, code: 'TENANT_REQUIRED' });

    const processKey = req.body?.process_key || 'governance.approval_chain.v1';
    const perm = permissionGate.assertWorkflowPermission({
      user: req.user,
      processKey,
      companyId,
      capabilities: req.user?.permissions,
    });
    if (!perm.ok) {
      return res.status(403).json({ ok: false, code: perm.code, reason: perm.reason, decision: perm.decision });
    }

    const result = await orchestrator.startWorkflow({
      processKey,
      companyId,
      userId: req.user.id,
      user: req.user,
      context: req.body?.context || {},
      correlationId: req.body?.correlation_id
    });
    _auditApi(req, 'start', { process_key: processKey, ok: result.ok });
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/instances/:id/signal', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = _companyId(req);
    const result = await orchestrator.signalWorkflow({
      instanceId: req.params.id,
      companyId,
      userId: req.user.id,
      event: req.body?.event,
      payload: req.body?.payload || {}
    });
    _auditApi(req, 'signal', { instance_id: req.params.id, event: req.body?.event });
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/approvals/pending', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = _companyId(req);
    const items = await approvalChain.listPending(companyId, req.query.limit);
    res.json({ ok: true, items, count: items.length, mode: flags.workflowEngineMode() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/approvals/:id/approve', requireAuth, requireHierarchy(4), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = _companyId(req);
    const result = await orchestrator.approveWorkflowStep(req.params.id, companyId, req.user.id);
    _auditApi(req, 'approve', { approval_id: req.params.id });
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/approvals/:id/reject', requireAuth, requireHierarchy(4), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = _companyId(req);
    const result = await orchestrator.rejectWorkflowStep(
      req.params.id,
      companyId,
      req.user.id,
      req.body?.reason
    );
    _auditApi(req, 'reject', { approval_id: req.params.id });
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/instances/:id/graph', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = _companyId(req);
    const nodes = await graph.listGraph(req.params.id, companyId);
    res.json({ ok: true, nodes });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.get('/instances/:id/audit', requireAuth, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = _companyId(req);
    const items = await audit.listAudit(req.params.id, companyId);
    res.json({ ok: true, items });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/instances/:id/rollback', requireAuth, requireHierarchy(4), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = _companyId(req);
    if (!flags.allowsRealExecution() && !flags.isAuditMode()) {
      return res.status(403).json({ ok: false, code: 'MODE_NOT_EXECUTABLE' });
    }
    const result = await orchestrator.rollbackWorkflow(req.params.id, companyId, req.user.id);
    _auditApi(req, 'rollback', { instance_id: req.params.id });
    res.status(result.ok ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

router.post('/instances/:id/recover', requireAuth, requireHierarchy(3), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const companyId = _companyId(req);
    const result = await recovery.recoverInstance(req.params.id, companyId);
    _auditApi(req, 'recover', { instance_id: req.params.id });
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message });
  }
});

module.exports = router;
