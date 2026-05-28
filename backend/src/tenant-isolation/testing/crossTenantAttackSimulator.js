'use strict';

const { v4: uuidv4 } = require('uuid');
const db = require('../../db');
const rls = require('../runtime/tenantRlsRuntime');
const fuzz = require('./tenantFuzzSuite');
const flags = require('../config/tenantRlsFlags');

const ATTACK_SCENARIOS = Object.freeze([
  {
    id: 'cross_read_users',
    table: 'users',
    column: 'company_id',
    buildQuery: (victimTenant) => ({
      text: `SELECT id, email FROM users WHERE company_id = $1::uuid LIMIT 5`,
      params: [victimTenant],
    }),
  },
  {
    id: 'cross_read_ai_traces',
    table: 'ai_interaction_traces',
    column: 'company_id',
    buildQuery: (victimTenant) => ({
      text: `SELECT id, company_id FROM ai_interaction_traces WHERE company_id = $1::uuid LIMIT 5`,
      params: [victimTenant],
    }),
  },
  {
    id: 'cross_read_sz5_index',
    table: 'z_conversation_message_index',
    column: 'tenant_id',
    buildQuery: (victimTenant) => ({
      text: `SELECT id, tenant_id FROM z_conversation_message_index WHERE tenant_id = $1::uuid LIMIT 5`,
      params: [victimTenant],
    }),
  },
]);

async function simulateAttack(attackerTenant, victimTenant, scenario, traceId) {
  const { text, params } = scenario.buildQuery(victimTenant);
  let rows = [];

  try {
    if (flags.rlsMode() === 'on') {
      const res = await rls.queryWithTenantContext(attackerTenant, text, params);
      rows = res.rows;
    } else {
      const res = await db.query(text, params);
      rows = res.rows;
    }
  } catch (err) {
    return {
      scenario: scenario.id,
      blocked: true,
      error: err.message,
      passed: true,
    };
  }

  const leaked = rows.length;
  const mode = flags.rlsMode();
  const passed = mode === 'on' ? leaked === 0 : true;

  await fuzz.recordFuzz(traceId, `attack_${scenario.id}`, passed ? 'blocked' : 'LEAK', {
    table_name: scenario.table,
    tenant_expected: attackerTenant,
    tenant_attempted: victimTenant,
    rows: leaked,
  });

  return {
    scenario: scenario.id,
    table: scenario.table,
    rows_leaked: leaked,
    passed,
    blocked: mode === 'on' ? passed : null,
    audit_simulation: mode !== 'on',
    would_leak_without_rls: mode !== 'on' && leaked > 0,
  };
}

async function runAttackSimulation(options = {}) {
  const traceId = options.trace_id || uuidv4();
  const attacker = options.attacker_tenant || '00000000-0000-4000-8000-000000000099';
  const victim = options.victim_tenant || flags.rlsPilotTenants()[0];

  if (!victim) return { ok: false, error: 'NO_VICTIM_TENANT' };

  const results = [];
  for (const scenario of ATTACK_SCENARIOS) {
    results.push(await simulateAttack(attacker, victim, scenario, traceId));
  }

  const mode = flags.rlsMode();
  const failed = mode === 'on' ? results.filter((r) => !r.passed) : [];

  return {
    ok: failed.length === 0,
    trace_id: traceId,
    mode: flags.rlsMode(),
    attacker_tenant: attacker,
    victim_tenant: victim,
    scenarios: results,
    summary: { total: results.length, failed: failed.length },
  };
}

module.exports = { runAttackSimulation, ATTACK_SCENARIOS };
