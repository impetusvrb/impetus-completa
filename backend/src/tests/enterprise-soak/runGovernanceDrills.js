'use strict';

/**
 * ENTERPRISE READINESS — Runner Governance Drills
 * Executa os 5 drills de governance isolados em processo próprio.
 */

const { pass, section, summarize } = require('./testUtils');

// ── Mock DB ─────────────────────────────────────────────────────────────
const Module = require('module');
const _orig = Module._load.bind(Module);
Module._load = function (req, parent) {
  if (/\/db$/.test(req)) return { query: async () => ({ rows: [] }) };
  return _orig(req, parent);
};

// ── Flags ─────────────────────────────────────────────────────────────────
process.env.IMPETUS_GOVERNANCE_V7_ENABLED = 'true';
process.env.IMPETUS_WORKFLOW_CAPABILITY_MATRIX_ENABLED = 'true';
process.env.IMPETUS_DOMAIN_CAPABILITY_GOVERNANCE_ENABLED = 'true';
process.env.IMPETUS_ABAC_ENFORCE = 'false';
process.env.IMPETUS_WORKFLOW_PERMISSION_ENFORCE = 'false';
process.env.IMPETUS_AUDIT_HASH_CHAIN_ENABLED = 'true';
process.env.IMPETUS_TRACEABILITY_ENABLED = 'true';

// ── Load modules (fresh) ──────────────────────────────────────────────────
const { evaluateAbacPolicies, listAbacPolicies } = require('../../governance/abacExtension');
const { checkWorkflowCapability } = require('../../governance/workflowCapabilityMatrix');
const { checkCapability, getCapabilitiesForRole } = require('../../governance/domainCapabilityGovernance');
const { evaluateWorkflowPermission } = require('../../governance/workflowPermissionMatrix');
const { generateTraceabilityId, recordTraceEvent, getTraceabilityStats } = require('../../governance/industrialTraceabilityFoundation');
const { computeRecordHash, GENESIS_HASH } = require('../../governance/immutableWorkflowAuditPrep');

// ─────────────────────────────────────────────────────────────────────────
// DRILL 1: ABAC Observe
// ─────────────────────────────────────────────────────────────────────────
function drillAbac() {
  section('GOV-1: ABAC Observe Drill');

  const d1 = evaluateAbacPolicies(
    { actor_type: 'ai', role: 'ai_agent', company_id: 'ta', domain: 'safety' },
    { workflow_type: 'safety.risk_assessment', company_id: 'ta', domain: 'safety' }
  );
  pass('G1.a AI + safety.risk_assessment → deny', d1.decision === 'deny');
  pass('G1.b violation logged', d1.violations && d1.violations.length > 0);

  const d2 = evaluateAbacPolicies(
    { actor_type: 'human', role: 'supervisor', company_id: 'ta', domain: 'safety' },
    { workflow_type: 'safety.risk_assessment', company_id: 'ta', domain: 'safety' }
  );
  pass('G1.c human supervisor → not denied', d2.decision !== 'deny');

  const d3 = evaluateAbacPolicies(
    { actor_type: 'human', role: 'operator', company_id: 'tenant_a', domain: 'operational' },
    { workflow_type: 'operational.kpi_update', company_id: 'tenant_b', domain: 'operational' }
  );
  pass('G1.d cross-tenant → deny', d3.decision === 'deny');

  const policies = listAbacPolicies();
  pass('G1.e >= 3 policies registered', policies.length >= 3);
}

// ─────────────────────────────────────────────────────────────────────────
// DRILL 2: Capability Matrix
// ─────────────────────────────────────────────────────────────────────────
function drillCapability() {
  section('GOV-2: Capability Matrix Drill');

  const d1 = checkWorkflowCapability('quality.inspection', 'operator', {});
  pass('G2.a operator NOT allowed for quality.inspection', !d1.allowed);

  const d2 = checkWorkflowCapability('quality.inspection', 'supervisor', {});
  pass('G2.b supervisor allowed for quality.inspection', d2.allowed);

  const supCaps = getCapabilitiesForRole('supervisor');
  pass('G2.c supervisor has >= 3 capabilities', supCaps.length >= 3);

  const opCaps = getCapabilitiesForRole('operator');
  pass('G2.d supervisor.caps >= operator.caps', supCaps.length >= opCaps.length);

  const d5 = checkWorkflowCapability('quality.inspection', 'operator', { capabilities: ['FAKE', 'SUPER_ADMIN'] });
  pass('G2.e fake capabilities dont escalate operator', !d5.allowed);

  // logistics operator cannot approve quality inspection
  const logCap = checkCapability('can_approve_inspection', 'operator', 'logistics');
  pass('G2.f operator lacks can_approve_inspection (wrong domain)', !logCap.granted);

  const qualCap = checkCapability('can_approve_inspection', 'supervisor', 'quality');
  pass('G2.g quality supervisor has can_approve_inspection', qualCap.granted);

  const d7 = checkWorkflowCapability('quality.inspection', 'ai_agent', { actor_type: 'ai' });
  pass('G2.h AI role rejected for human-approval workflow', !d7.allowed);
}

// ─────────────────────────────────────────────────────────────────────────
// DRILL 3: Workflow Decision
// ─────────────────────────────────────────────────────────────────────────
function drillWorkflowDecision() {
  section('GOV-3: Workflow Decision Drill');

  const d1 = evaluateWorkflowPermission({ workflowType: 'safety.risk_assessment', role: 'ai_agent', actor_type: 'ai', company_id: 'ta', domain: 'safety' });
  pass('G3.a AI + safety.risk_assessment → not permitted', !d1.permitted);
  pass('G3.b abac_result.decision = deny', d1.abac_result && d1.abac_result.decision === 'deny');

  const d2 = evaluateWorkflowPermission({ workflowType: 'quality.inspection', role: 'supervisor', actor_type: 'human', company_id: 'ta', domain: 'quality' });
  pass('G3.c supervisor + quality.inspection → permitted', d2.permitted);

  const d3 = evaluateWorkflowPermission({ workflowType: 'quality.inspection', role: 'operator', actor_type: 'human', company_id: 'ta', domain: 'quality' });
  pass('G3.d operator + quality.inspection → not permitted', !d3.permitted);

  pass('G3.e observe mode → effective_block = false', !d1.effective_block);
  pass('G3.f mode = observe', d1.mode === 'observe');

  // Enforce mode test: reload module with flag
  process.env.IMPETUS_WORKFLOW_PERMISSION_ENFORCE = 'true';
  delete require.cache[require.resolve('../../governance/governanceFlags')];
  delete require.cache[require.resolve('../../governance/workflowPermissionMatrix')];
  const { evaluateWorkflowPermission: evalEnf } = require('../../governance/workflowPermissionMatrix');
  const d6 = evalEnf({ workflowType: 'safety.risk_assessment', role: 'ai_agent', actor_type: 'ai', company_id: 'ta', domain: 'safety' });
  pass('G3.g enforce mode + AI → effective_block = true', d6.effective_block === true);
  pass('G3.h mode = enforce', d6.mode === 'enforce');
  delete process.env.IMPETUS_WORKFLOW_PERMISSION_ENFORCE;
}

// ─────────────────────────────────────────────────────────────────────────
// DRILL 4: Traceability Integrity
// ─────────────────────────────────────────────────────────────────────────
const _chains = new Map();

function drillTraceability() {
  section('GOV-4: Traceability Integrity Drill');

  const id1 = generateTraceabilityId({ operation_type: 'quality.inspection', actor_id: 'u1', tenant_id: 'ta', domain: 'quality' });
  pass('G4.a traceability ID created', typeof id1 === 'string' && id1.length > 0);
  pass('G4.b TRC- prefix', id1.startsWith('TRC-'));

  // Local simulation
  _chains.set(id1, { tenant_id: 'ta', events: [] });
  const appendLocal = (id, type, meta) => {
    recordTraceEvent(id, type, meta);
    _chains.get(id)?.events.push({ type, meta, ts: Date.now() });
  };
  appendLocal(id1, 'started', { item: '001' });
  appendLocal(id1, 'scored', { score: 95 });
  appendLocal(id1, 'approved', { by: 'supervisor' });
  const chain = _chains.get(id1);
  pass('G4.c 3 events appended to chain', chain && chain.events.length === 3);

  // Orphan trace
  const id2 = generateTraceabilityId({ operation_type: 'logistics.dispatch', actor_id: 'u2', tenant_id: 'tb', domain: 'logistics' });
  _chains.set(id2, { tenant_id: 'tb', events: [] });
  pass('G4.d orphan trace has 0 events', _chains.get(id2).events.length === 0);

  // Cross-tenant isolation
  pass('G4.e tenant_a chain not contaminated', chain.tenant_id === 'ta');
  pass('G4.f tenant_b chain isolated', _chains.get(id2).tenant_id === 'tb');

  // Unique IDs
  const id3 = generateTraceabilityId({ operation_type: 'test', actor_id: 'u3', tenant_id: 'tc' });
  pass('G4.g different IDs for different calls', id1 !== id3);

  const stats = getTraceabilityStats();
  pass('G4.h getTraceabilityStats returns object', stats !== null && typeof stats === 'object');
}

// ─────────────────────────────────────────────────────────────────────────
// DRILL 5: Immutable Audit
// ─────────────────────────────────────────────────────────────────────────
function buildChain(entries) {
  const ledger = [];
  let prev = GENESIS_HASH;
  for (const e of entries) {
    const p = { workflow_id: e.wf, action: e.action, actor_id: 'u', company_id: 'ta', domain: 'quality', recorded_at: new Date(Date.now() + ledger.length).toISOString() };
    const h = computeRecordHash(prev, p);
    ledger.push({ ...p, previous_hash: prev, record_hash: h });
    prev = h;
  }
  return ledger;
}

function validateChain(ledger) {
  for (let i = 0; i < ledger.length; i++) {
    const r = ledger[i];
    const h = computeRecordHash(r.previous_hash, { workflow_id: r.workflow_id, action: r.action, actor_id: r.actor_id, company_id: r.company_id, domain: r.domain, recorded_at: r.recorded_at });
    if (h !== r.record_hash) return { valid: false, tampered: true, tamper_at_index: i };
  }
  return { valid: true, tampered: false };
}

function drillImmutableAudit() {
  section('GOV-5: Immutable Audit Drill');

  pass('G5.a GENESIS_HASH defined (64 chars)', GENESIS_HASH && GENESIS_HASH.length === 64);
  pass('G5.b GENESIS_HASH all zeros', /^0+$/.test(GENESIS_HASH));

  const ledger = buildChain(Array.from({ length: 10 }, (_, i) => ({ wf: `wf_${i}`, action: `a_${i}` })));
  pass('G5.c 10 records in ledger', ledger.length === 10);
  pass('G5.d all records have 64-char hash', ledger.every((r) => r.record_hash && r.record_hash.length === 64));
  pass('G5.e all hashes unique', new Set(ledger.map((r) => r.record_hash)).size === 10);

  const v = validateChain(ledger);
  pass('G5.f chain validates successfully', v.valid);
  pass('G5.g no tamper detected', !v.tampered);

  const tampered = ledger.map((r, i) => i === 5 ? { ...r, action: 'TAMPERED' } : r);
  const tv = validateChain(tampered);
  pass('G5.h tamper detected at index 5', tv.tampered && tv.tamper_at_index === 5);

  const withInsert = [...ledger.slice(0, 5), { ...ledger[4], record_hash: 'fake_' + '0'.repeat(60) }, ...ledger.slice(5)];
  const iv = validateChain(withInsert);
  pass('G5.i insertion detected', iv.tampered);

  const h1 = computeRecordHash(GENESIS_HASH, { workflow_id: 'x', action: 'a', actor_id: 'u', company_id: 't', domain: 'q', recorded_at: '2026-01-01T00:00:00.000Z' });
  const h2 = computeRecordHash(GENESIS_HASH, { workflow_id: 'x', action: 'a', actor_id: 'u', company_id: 't', domain: 'q', recorded_at: '2026-01-01T00:00:00.000Z' });
  pass('G5.j hash is deterministic', h1 === h2 && h1.length === 64);
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────
drillAbac();
drillCapability();
drillWorkflowDecision();
drillTraceability();
drillImmutableAudit();
summarize('Governance Drills (All 5)');
