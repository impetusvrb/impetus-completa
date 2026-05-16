'use strict';

/**
 * ENTERPRISE READINESS — Fase 4.2
 * Capability Matrix Drill
 *
 * Valida: capability inheritance, domain restrictions, escalation prevention, invalid capability injection.
 * API correcta: checkWorkflowCapability(type, role, ctx) retorna { allowed, mode, reason }
 */

const Module = require('module');
const _orig = Module._load.bind(Module);
Module._load = function (req, parent) {
  if (/\/db$/.test(req)) return { query: async () => ({ rows: [] }) };
  return _orig(req, parent);
};

process.env.IMPETUS_GOVERNANCE_V7_ENABLED = 'true';
process.env.IMPETUS_WORKFLOW_CAPABILITY_MATRIX_ENABLED = 'true';
process.env.IMPETUS_DOMAIN_CAPABILITY_GOVERNANCE_ENABLED = 'true';

const { checkWorkflowCapability } = require('../../../governance/workflowCapabilityMatrix');
const { checkCapability, getCapabilitiesForRole } = require('../../../governance/domainCapabilityGovernance');

function runCapabilityMatrixDrill() {
  const results = [];
  const violations = [];

  function assert(label, condition) {
    results.push({ label, ok: condition });
    if (!condition) violations.push(label);
  }

  // ── D1: Operator cannot perform quality.inspection ────────────────────
  const d1 = checkWorkflowCapability('quality.inspection', 'operator', {});
  assert('CM-1.a: operator not allowed for quality.inspection', !d1.allowed);

  // ── D2: Supervisor can perform quality.inspection ─────────────────────
  const d2 = checkWorkflowCapability('quality.inspection', 'supervisor', {});
  assert('CM-2.a: supervisor allowed for quality.inspection', d2.allowed);

  // ── D3: Supervisor has relevant capabilities ──────────────────────────
  const supervisorCaps = getCapabilitiesForRole('supervisor');
  assert('CM-3.a: supervisor has at least 3 capabilities', supervisorCaps.length >= 3);

  // ── D4: Supervisor has more capabilities than operator ────────────────
  const operatorCaps = getCapabilitiesForRole('operator');
  assert('CM-4.a: supervisor.caps >= operator.caps', supervisorCaps.length >= operatorCaps.length);

  // ── D5: Invalid/fake capabilities don't escalate privileges ──────────
  const d5 = checkWorkflowCapability('quality.inspection', 'operator', {
    capabilities: ['FAKE_SUPER_ADMIN', 'can_bypass_all', 'ROOT_ACCESS']
  });
  assert('CM-5.a: fake capabilities dont escalate operator', !d5.allowed);

  // ── D6: Capability domain restriction ────────────────────────────────
  const logisticsCap = checkCapability('can_approve_inspection', 'operator', 'logistics');
  assert('CM-6.a: logistics operator lacks quality inspection cap', !logisticsCap.granted);

  const qualityCap = checkCapability('can_approve_inspection', 'supervisor', 'quality');
  assert('CM-6.b: quality supervisor has inspection cap', qualityCap.granted);

  // ── D7: Workflow requiring human approval rejects AI role ─────────────
  const d7 = checkWorkflowCapability('quality.inspection', 'ai_agent', { actor_type: 'ai' });
  assert('CM-7.a: AI role not allowed for human-approval workflow', !d7.allowed);

  // ── D8: Unknown workflow type — graceful degradation ─────────────────
  let crashed = false;
  try { checkWorkflowCapability('nonexistent.workflow_xyz', 'admin', {}); } catch { crashed = true; }
  assert('CM-8.a: unknown workflow type does not crash', !crashed);

  // ── D9: Safety domain capability checks ──────────────────────────────
  const riskCap = checkCapability('can_assess_risk', 'supervisor', 'safety');
  assert('CM-9.a: supervisor has can_assess_risk in safety domain', riskCap.granted);

  return { results, violations };
}

module.exports = { runCapabilityMatrixDrill };
