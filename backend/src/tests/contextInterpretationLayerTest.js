'use strict';

const assert = require('assert');
const { interpret } = require('../ai/contextInterpretationLayer');

function run() {
  console.info('[TEST] contextInterpretationLayer — iniciando');
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      passed++;
      console.info(`  ✓ ${name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${name}:`, err.message);
    }
  }

  test('tenant_empty → no_data_consultative', () => {
    const r = interpret({
      user: { id: 'u1', company_id: 'c1' },
      intent: 'operational_overview',
      data_state: 'tenant_empty',
      data_completeness: { score: 0, reason: 'no_machines_registered', missing_signals: [] },
      coverage: { machines_known: 0 },
      session_context: {}
    });
    assert.strictEqual(r.narrative_mode, 'no_data_consultative');
    assert(r.must_avoid_phrases.length > 0);
    assert(r.must_propose_actions.length > 0);
    assert.strictEqual(r.confidence_ceiling, 30);
    assert.strictEqual(r.briefing_schema_version, 'v1');
  });

  test('tenant_inactive → config_diagnostic', () => {
    const r = interpret({
      user: { id: 'u1', company_id: 'c1' },
      intent: 'operational_overview',
      data_state: 'tenant_inactive',
      data_completeness: { score: 0.1, reason: 'no_telemetry_in_window', missing_signals: [] },
      coverage: { machines_known: 5 },
      session_context: {}
    });
    assert.strictEqual(r.narrative_mode, 'config_diagnostic');
    assert(r.briefing.includes('5'));
  });

  test('production_active → operational_status', () => {
    const r = interpret({
      user: { id: 'u1', company_id: 'c1' },
      intent: 'operational_overview',
      data_state: 'production_active',
      data_completeness: { score: 0.8, reason: 'fully_covered', missing_signals: [] },
      coverage: { machines_known: 10, machines_with_recent_telemetry: 8 },
      session_context: {}
    });
    assert.strictEqual(r.narrative_mode, 'operational_status');
    assert.strictEqual(r.must_avoid_phrases.length, 0);
    assert.strictEqual(r.confidence_ceiling, 100);
  });

  test('production_paused → operational_attention', () => {
    const r = interpret({
      user: { id: 'u1', company_id: 'c1' },
      intent: 'operational_overview',
      data_state: 'production_paused',
      data_completeness: { score: 0.3 },
      coverage: { machines_known: 3 },
      session_context: {}
    });
    assert.strictEqual(r.narrative_mode, 'operational_attention');
    assert.strictEqual(r.confidence_floor, 40);
    assert.strictEqual(r.confidence_ceiling, 80);
  });

  test('briefing_signature é determinístico', () => {
    const input = {
      user: { id: 'u1', company_id: 'c1' },
      intent: 'operational_overview',
      data_state: 'tenant_empty',
      data_completeness: { score: 0 },
      coverage: { machines_known: 0 },
      session_context: {}
    };
    const r1 = interpret(input);
    const r2 = interpret(input);
    assert.strictEqual(r1.briefing_signature, r2.briefing_signature);
  });

  test('expires_at é futuro', () => {
    const r = interpret({
      user: { id: 'u1', company_id: 'c1' },
      intent: 'operational_overview',
      data_state: 'production_active',
      data_completeness: { score: 0.9 },
      coverage: {},
      session_context: {}
    });
    assert(new Date(r.expires_at) > new Date());
  });

  test('repetição detectada adiciona variação ao briefing', () => {
    const input = {
      user: { id: 'u1', company_id: 'c1' },
      intent: 'operational_overview',
      data_state: 'tenant_empty',
      data_completeness: { score: 0 },
      coverage: { machines_known: 0 },
      session_context: {}
    };
    const r1 = interpret(input);
    const r2 = interpret({
      ...input,
      session_context: { response_fingerprints: [r1.briefing_signature] }
    });
    assert(r2.briefing.includes('VARIAÇÃO REQUERIDA'));
  });

  test('data_state desconhecido retorna fallback seguro', () => {
    const r = interpret({
      user: { id: 'u1', company_id: 'c1' },
      intent: 'operational_overview',
      data_state: 'unknown_state',
      data_completeness: {},
      coverage: {},
      session_context: {}
    });
    assert.strictEqual(r.narrative_mode, 'unknown');
    assert(r.briefing.includes('desconhecido'));
  });

  console.info(`[TEST] contextInterpretationLayer — ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
