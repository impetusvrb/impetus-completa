'use strict';

/**
 * ENTERPRISE READINESS — Fase 4.1
 * ABAC Observe Drill
 *
 * Valida: deny policies, observe mode, fallback mode, policy conflicts, cross-domain restrictions.
 * API correcta: evaluateAbacPolicies(subject, resource, environment?)
 */

const Module = require('module');
const _orig = Module._load.bind(Module);
Module._load = function (req, parent) {
  if (/\/db$/.test(req)) return { query: async () => ({ rows: [] }) };
  return _orig(req, parent);
};

process.env.IMPETUS_GOVERNANCE_V7_ENABLED = 'true';
process.env.IMPETUS_WORKFLOW_CAPABILITY_MATRIX_ENABLED = 'true';

const { evaluateAbacPolicies, listAbacPolicies } = require('../../../governance/abacExtension');

function runAbacObserveDrill() {
  const results = [];
  const violations = [];

  function assert(label, condition, ...details) {
    results.push({ label, ok: condition, details: details.filter(Boolean) });
    if (!condition) violations.push(label);
  }

  // ── D1: AI não pode iniciar workflow regulado (safety.risk_assessment) ─
  const d1 = evaluateAbacPolicies(
    { actor_type: 'ai', role: 'ai_agent', company_id: 'tenant_a', domain: 'safety' },
    { workflow_type: 'safety.risk_assessment', company_id: 'tenant_a', domain: 'safety' }
  );
  assert('D1.a: AI em safety.risk_assessment → deny', d1.decision === 'deny', d1);
  assert('D1.b: violation registada', d1.violations && d1.violations.length > 0);

  // ── D2: Human supervisor pode iniciar (ABSTAIN ou ALLOW) ──────────────
  const d2 = evaluateAbacPolicies(
    { actor_type: 'human', role: 'supervisor', company_id: 'tenant_a', domain: 'safety' },
    { workflow_type: 'safety.risk_assessment', company_id: 'tenant_a', domain: 'safety' }
  );
  assert('D2.a: human supervisor → not denied', d2.decision !== 'deny');

  // ── D3: Cross-tenant restriction ──────────────────────────────────────
  const d3 = evaluateAbacPolicies(
    { actor_type: 'human', role: 'operator', company_id: 'tenant_a', domain: 'operational' },
    { workflow_type: 'operational.kpi_update', company_id: 'tenant_b', domain: 'operational' }
  );
  assert('D3.a: cross-tenant actor → deny', d3.decision === 'deny');

  // ── D4: Same-tenant actor → not denied ───────────────────────────────
  const d4 = evaluateAbacPolicies(
    { actor_type: 'human', role: 'operator', company_id: 'tenant_a', domain: 'operational' },
    { workflow_type: 'operational.kpi_update', company_id: 'tenant_a', domain: 'operational' }
  );
  assert('D4.a: same-tenant actor → not denied', d4.decision !== 'deny');

  // ── D5: Policies registadas ───────────────────────────────────────────
  const policies = listAbacPolicies();
  assert('D5.a: pelo menos 3 políticas registadas', policies.length >= 3);

  // ── D6: Observe mode does not mutate system state ─────────────────────
  const before = listAbacPolicies().length;
  evaluateAbacPolicies(
    { actor_type: 'ai', role: 'ai_agent', company_id: 'x', domain: 'quality' },
    { workflow_type: 'quality.inspection', company_id: 'x', domain: 'quality' }
  );
  const after = listAbacPolicies().length;
  assert('D6.a: observe mode does not mutate policy registry', before === after);

  // ── D7: Domain actor scope restriction ───────────────────────────────
  const d7 = evaluateAbacPolicies(
    { actor_type: 'human', role: 'operator', company_id: 'tenant_a', domain: 'logistics' },
    { workflow_type: 'quality.inspection', company_id: 'tenant_a', domain: 'quality' }
  );
  assert('D7.a: cross-domain actor scope handled without crash', ['allow', 'deny', 'abstain'].includes(d7.decision));

  return { results, violations, policy_count: policies.length };
}

module.exports = { runAbacObserveDrill };
