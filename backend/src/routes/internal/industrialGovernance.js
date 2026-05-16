'use strict';

/**
 * WAVE 7 — Internal API: governança industrial.
 * Todas as rotas protegidas por requireInternalAccess.
 */

const express = require('express');
const router = express.Router();

const { getGovernanceHealth } = require('../../governance/industrialGovernanceRuntime');
const { listWorkflowCapabilities, getWorkflowCapability, checkWorkflowCapability, getCapabilitiesForDomain } = require('../../governance/workflowCapabilityMatrix');
const { listAbacPolicies, evaluateAbacPolicies } = require('../../governance/abacExtension');
const { getAuditStats, listMemoryAuditBuffer } = require('../../governance/industrialAuditStructure');
const { validateHashChain, getImmutableLedgerStats } = require('../../governance/immutableWorkflowAuditPrep');
const { getLgpdStats, listClassifications, listFieldsRequiringAnonymization } = require('../../governance/lgpdIndustrialPrep');
const { getDomainCapabilityStats, listCapabilitiesForDomain, getCapabilitiesForRole } = require('../../governance/domainCapabilityGovernance');
const { getTraceabilityStats } = require('../../governance/industrialTraceabilityFoundation');
const { evaluateWorkflowPermission } = require('../../governance/workflowPermissionMatrix');

// GET /api/internal/governance/health
router.get('/health', (req, res) => {
  res.json(getGovernanceHealth());
});

// GET /api/internal/governance/workflow-capabilities
router.get('/workflow-capabilities', (req, res) => {
  const { domain } = req.query;
  const list = domain ? getCapabilitiesForDomain(String(domain)) : listWorkflowCapabilities();
  res.json({ count: list.length, entries: list });
});

// GET /api/internal/governance/workflow-capabilities/:workflowType
router.get('/workflow-capabilities/:workflowType', (req, res) => {
  const entry = getWorkflowCapability(req.params.workflowType);
  if (!entry) return res.status(404).json({ error: 'workflow_type_not_found' });
  res.json(entry);
});

// POST /api/internal/governance/workflow-capabilities/check
router.post('/workflow-capabilities/check', (req, res) => {
  const { workflow_type, role, capabilities } = req.body || {};
  if (!workflow_type || !role) return res.status(400).json({ error: 'workflow_type and role required' });
  const result = checkWorkflowCapability(workflow_type, role, { capabilities });
  res.json(result);
});

// GET /api/internal/governance/abac/policies
router.get('/abac/policies', (req, res) => {
  res.json({ policies: listAbacPolicies() });
});

// POST /api/internal/governance/abac/evaluate
router.post('/abac/evaluate', (req, res) => {
  const { subject, resource, environment } = req.body || {};
  if (!subject || !resource) return res.status(400).json({ error: 'subject and resource required' });
  const result = evaluateAbacPolicies(subject, resource, environment || {});
  res.json(result);
});

// POST /api/internal/governance/workflow-permission/evaluate
router.post('/workflow-permission/evaluate', (req, res) => {
  const { workflow_type, role, company_id, domain, actor_type, capabilities } = req.body || {};
  if (!workflow_type || !role) return res.status(400).json({ error: 'workflow_type and role required' });
  const result = evaluateWorkflowPermission({ workflowType: workflow_type, role, company_id, domain, actor_type, capabilities });
  res.json(result);
});

// GET /api/internal/governance/audit/stats
router.get('/audit/stats', (req, res) => {
  res.json(getAuditStats());
});

// GET /api/internal/governance/audit/memory-buffer
router.get('/audit/memory-buffer', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
  const buf = listMemoryAuditBuffer().slice(-limit);
  res.json({ count: buf.length, events: buf });
});

// GET /api/internal/governance/ledger/stats
router.get('/ledger/stats', (req, res) => {
  res.json(getImmutableLedgerStats());
});

// GET /api/internal/governance/ledger/validate
router.get('/ledger/validate', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '100', 10), 1000);
  const result = await validateHashChain(limit);
  res.json(result);
});

// GET /api/internal/governance/lgpd/stats
router.get('/lgpd/stats', (req, res) => {
  res.json(getLgpdStats());
});

// GET /api/internal/governance/lgpd/classifications
router.get('/lgpd/classifications', (req, res) => {
  const list = listClassifications();
  res.json({ count: list.length, classifications: list });
});

// GET /api/internal/governance/lgpd/anonymization-required
router.get('/lgpd/anonymization-required', (req, res) => {
  const list = listFieldsRequiringAnonymization();
  res.json({ count: list.length, fields: list });
});

// GET /api/internal/governance/domain-capabilities/stats
router.get('/domain-capabilities/stats', (req, res) => {
  res.json(getDomainCapabilityStats());
});

// GET /api/internal/governance/domain-capabilities/:domain
router.get('/domain-capabilities/:domain', (req, res) => {
  const caps = listCapabilitiesForDomain(req.params.domain);
  res.json({ domain: req.params.domain, count: caps.length, capabilities: caps });
});

// GET /api/internal/governance/domain-capabilities/role/:role
router.get('/domain-capabilities/role/:role', (req, res) => {
  const caps = getCapabilitiesForRole(req.params.role);
  res.json({ role: req.params.role, count: caps.length, capabilities: caps });
});

// GET /api/internal/governance/traceability/stats
router.get('/traceability/stats', (req, res) => {
  res.json(getTraceabilityStats());
});

module.exports = router;
