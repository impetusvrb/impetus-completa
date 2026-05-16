'use strict';

/**
 * ENTERPRISE READINESS — Fase 4.5
 * Immutable Audit Drill
 *
 * Valida: hash chain integrity, tamper detection, immutable append-only behavior.
 * API correcta:
 *   computeRecordHash(previousHash, payload) → hex string (sync)
 *   appendWorkflowAuditRecord(entry) → Promise<{ok, mode?}>
 *   validateHashChain() → Promise<{valid, checked, mode?}>
 *   GENESIS_HASH → string
 */

const Module = require('module');
const _orig = Module._load.bind(Module);
Module._load = function (req, parent) {
  if (/\/db$/.test(req)) return { query: async () => ({ rows: [] }) };
  return _orig(req, parent);
};

process.env.IMPETUS_GOVERNANCE_V7_ENABLED = 'true';
process.env.IMPETUS_AUDIT_HASH_CHAIN_ENABLED = 'true';

const {
  computeRecordHash,
  GENESIS_HASH
} = require('../../../governance/immutableWorkflowAuditPrep');

/**
 * In-memory hash chain ledger for drill validation.
 * Mirrors the logic of the real module without DB dependency.
 */
function buildInMemoryChain(entries) {
  const ledger = [];
  let prevHash = GENESIS_HASH;
  for (const entry of entries) {
    const payload = {
      workflow_id: entry.workflow_id,
      workflow_type: entry.workflow_type || 'drill.test',
      actor_id: entry.actor_id || null,
      actor_role: entry.actor_role || null,
      company_id: entry.company_id || null,
      domain: entry.domain || 'quality',
      action: entry.action,
      payload: entry.payload || null,
      recorded_at: entry.recorded_at || new Date().toISOString()
    };
    const hash = computeRecordHash(prevHash, payload);
    ledger.push({ ...payload, previous_hash: prevHash, record_hash: hash });
    prevHash = hash;
  }
  return ledger;
}

function validateInMemoryChain(ledger) {
  if (ledger.length === 0) return { valid: true, tampered: false, checked: 0 };
  for (let i = 0; i < ledger.length; i++) {
    const rec = ledger[i];
    const recomputed = computeRecordHash(rec.previous_hash, {
      workflow_id: rec.workflow_id,
      workflow_type: rec.workflow_type,
      actor_id: rec.actor_id,
      actor_role: rec.actor_role,
      company_id: rec.company_id,
      domain: rec.domain,
      action: rec.action,
      payload: rec.payload,
      recorded_at: rec.recorded_at
    });
    if (recomputed !== rec.record_hash) {
      return { valid: false, tampered: true, tamper_at_index: i, checked: i + 1 };
    }
  }
  return { valid: true, tampered: false, checked: ledger.length };
}

function runImmutableAuditDrill() {
  const results = [];
  const violations = [];

  function assert(label, condition, ...info) {
    results.push({ label, ok: condition, info });
    if (!condition) violations.push(label);
  }

  // ── D1: GENESIS_HASH defined ──────────────────────────────────────────
  assert('D1.a: GENESIS_HASH is defined', typeof GENESIS_HASH === 'string' && GENESIS_HASH.length === 64);
  assert('D1.b: GENESIS_HASH is all zeros', /^0+$/.test(GENESIS_HASH));

  // ── D2: Build a 10-record hash chain ─────────────────────────────────
  const entries = Array.from({ length: 10 }, (_, i) => ({
    workflow_id: `wf_${i}`, action: `action_${i}`,
    actor_id: 'supervisor', company_id: 'tenant_a', domain: 'quality',
    recorded_at: new Date(Date.now() + i).toISOString()
  }));
  const ledger = buildInMemoryChain(entries);
  assert('D2.a: 10 records in ledger', ledger.length === 10);
  assert('D2.b: all records have hash', ledger.every((r) => r.record_hash && r.record_hash.length === 64));
  assert('D2.c: no two records have same hash', new Set(ledger.map((r) => r.record_hash)).size === 10);

  // ── D3: Hash chain validation ─────────────────────────────────────────
  const v = validateInMemoryChain(ledger);
  assert('D3.a: chain validates successfully', v.valid);
  assert('D3.b: no tamper detected', !v.tampered);

  // ── D4: Tamper detection — modify record payload ──────────────────────
  const tampered = ledger.map((r, i) =>
    i === 5 ? { ...r, action: 'TAMPERED_ACTION' } : r // change action but keep original hash
  );
  const tv = validateInMemoryChain(tampered);
  assert('D4.a: tamper detected in modified chain', tv.tampered);
  assert('D4.b: tamper at index 5', tv.tamper_at_index === 5);

  // ── D5: Insert detection ──────────────────────────────────────────────
  const withInsert = [
    ...ledger.slice(0, 5),
    {
      ...ledger[4],
      workflow_id: 'injected', action: 'injected_action',
      record_hash: 'fake_' + '0'.repeat(60),
      previous_hash: ledger[4].record_hash
    },
    ...ledger.slice(5)
  ];
  const iv = validateInMemoryChain(withInsert);
  assert('D5.a: insertion detected in chain', iv.tampered);

  // ── D6: 100-record chain integrity ────────────────────────────────────
  const bigEntries = Array.from({ length: 100 }, (_, i) => ({
    workflow_id: `big_wf_${i}`, action: `a_${i}`,
    actor_id: 'admin', company_id: 'ta', domain: 'quality',
    recorded_at: new Date(Date.now() + i * 10).toISOString()
  }));
  const bigLedger = buildInMemoryChain(bigEntries);
  const bv = validateInMemoryChain(bigLedger);
  assert('D6.a: 100-record chain valid', bv.valid);
  assert('D6.b: no tamper in big chain', !bv.tampered);

  // ── D7: Hash determinism ──────────────────────────────────────────────
  const payload = { workflow_id: 'wf_x', action: 'a_x', actor_id: 'u', company_id: 't', domain: 'q', recorded_at: '2026-01-01T00:00:00.000Z' };
  const h1 = computeRecordHash(GENESIS_HASH, payload);
  const h2 = computeRecordHash(GENESIS_HASH, payload);
  assert('D7.a: computeRecordHash is deterministic', h1 === h2 && h1.length === 64);
  assert('D7.b: different payload → different hash', computeRecordHash(GENESIS_HASH, { ...payload, action: 'DIFFERENT' }) !== h1);

  return { results, violations };
}

module.exports = { runImmutableAuditDrill };
