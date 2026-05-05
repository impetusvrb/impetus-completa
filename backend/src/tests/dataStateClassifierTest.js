'use strict';

const assert = require('assert');
const { classify } = require('../services/dataStateClassifier');

function run() {
  console.info('[TEST] dataStateClassifier — iniciando');
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

  test('tenant_empty quando machines=[]', () => {
    const r = classify({ machines: [], events: [], workOrders: [], kpis: [] });
    assert.strictEqual(r.data_state, 'tenant_empty');
    assert.strictEqual(r.data_completeness.score, 0);
    assert.strictEqual(r.data_completeness.reason, 'no_machines_registered');
    assert.strictEqual(r.coverage.machines_known, 0);
  });

  test('tenant_inactive com máquinas sem telemetria', () => {
    const machines = [
      { id: 'm1', name: 'CNC-01', last_seen: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() },
      { id: 'm2', name: 'CNC-02' }
    ];
    const r = classify({ machines, events: [], workOrders: [], kpis: [] });
    assert.strictEqual(r.data_state, 'tenant_inactive');
    assert.strictEqual(r.data_completeness.reason, 'no_telemetry_in_window');
  });

  test('production_paused com telemetria recente mas sem eventos', () => {
    const machines = [
      { id: 'm1', name: 'CNC-01', last_seen: new Date().toISOString() }
    ];
    const r = classify({ machines, events: [], workOrders: [], kpis: [] });
    assert.strictEqual(r.data_state, 'production_paused');
  });

  test('production_active com eventos recentes', () => {
    const machines = [{ id: 'm1', name: 'CNC-01' }];
    const events = [
      { id: 'e1', machine_id: 'm1', created_at: new Date().toISOString(), type: 'production' }
    ];
    const r = classify({ machines, events, workOrders: [], kpis: [] });
    assert.strictEqual(r.data_state, 'production_active');
  });

  test('múltiplas máquinas com eventos parciais', () => {
    const machines = [
      { id: 'm1', name: 'CNC-01' },
      { id: 'm2', name: 'CNC-02' },
      { id: 'm3', name: 'CNC-03' }
    ];
    const events = [
      { id: 'e1', machine_id: 'm1', created_at: new Date().toISOString() }
    ];
    const r = classify({ machines, events, workOrders: [], kpis: [] });
    assert.strictEqual(r.data_state, 'production_active');
    assert(r.data_completeness.score > 0);
  });

  test('completude alta com todos os sinais', () => {
    const machines = [{ id: 'm1', name: 'CNC-01', last_seen: new Date().toISOString() }];
    const events = Array.from({ length: 6 }, (_, i) => ({
      id: `e${i}`, machine_id: 'm1', created_at: new Date().toISOString()
    }));
    const workOrders = [{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }];
    const kpis = [{ id: 'k1' }, { id: 'k2' }];
    const r = classify({ machines, events, workOrders, kpis });
    assert.strictEqual(r.data_state, 'production_active');
    assert.strictEqual(r.data_completeness.reason, 'fully_covered');
    assert(r.data_completeness.score >= 0.8, `score ${r.data_completeness.score} deveria ser >= 0.8`);
  });

  test('coverage.last_event_at preenchido', () => {
    const now = new Date().toISOString();
    const r = classify({
      machines: [{ id: 'm1', name: 'X' }],
      events: [{ id: 'e1', machine_id: 'm1', created_at: now }],
      workOrders: [],
      kpis: []
    });
    assert.ok(r.coverage.last_event_at);
  });

  test('missing_signals para tenant_empty', () => {
    const r = classify({ machines: [], events: [], workOrders: [], kpis: [] });
    assert(r.data_completeness.missing_signals.includes('plc_telemetry'));
    assert(r.data_completeness.missing_signals.includes('production_events'));
  });

  test('entradas undefined tratadas', () => {
    const r = classify({});
    assert.strictEqual(r.data_state, 'tenant_empty');
  });

  test('entradas não-array tratadas como vazio', () => {
    const r = classify({ machines: null, events: 'invalid', workOrders: 42 });
    assert.strictEqual(r.data_state, 'tenant_empty');
  });

  test('máquina com updated_at recente é ativa', () => {
    const machines = [{ id: 'm1', name: 'X', updated_at: new Date().toISOString() }];
    const r = classify({ machines, events: [], workOrders: [], kpis: [] });
    assert.strictEqual(r.data_state, 'production_paused');
  });

  test('events_window_minutes padrão é 60', () => {
    const r = classify({ machines: [], events: [] });
    assert.strictEqual(r.coverage.events_window_minutes, 60);
  });

  console.info(`[TEST] dataStateClassifier — ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
