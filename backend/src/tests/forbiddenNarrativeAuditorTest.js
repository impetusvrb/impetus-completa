'use strict';

const assert = require('assert');
const { auditResponse } = require('../middleware/forbiddenNarrativeAuditor');

function run() {
  console.info('[TEST] forbiddenNarrativeAuditor — iniciando');
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

  test('texto limpo passa sem alteração', () => {
    const r = auditResponse({
      text: 'Recomendo cadastrar suas máquinas.',
      must_avoid_phrases: ['operação parada'],
      data_state: 'tenant_empty',
      narrative_mode: 'no_data_consultative'
    });
    assert.strictEqual(r.clean, true);
    assert.strictEqual(r.violations.length, 0);
    assert.strictEqual(r.action_taken, 'none');
  });

  test('frase proibida detectada e substituída em tenant_empty', () => {
    const r = auditResponse({
      text: 'A operação está totalmente parada sem máquinas ativas.',
      must_avoid_phrases: ['operação parada', 'operação está totalmente parada'],
      data_state: 'tenant_empty',
      narrative_mode: 'no_data_consultative'
    });
    assert.strictEqual(r.clean, false);
    assert(r.violations.length > 0);
    assert.strictEqual(r.action_taken, 'replaced');
    assert(!r.sanitized_text.toLowerCase().includes('operação parada'));
  });

  test('tenant_inactive usa fallback de telemetria', () => {
    const r = auditResponse({
      text: 'Perda de receita e atrasos nas entregas.',
      must_avoid_phrases: ['perda de receita', 'atrasos nas entregas'],
      data_state: 'tenant_inactive',
      narrative_mode: 'config_diagnostic'
    });
    assert.strictEqual(r.clean, false);
    assert(r.sanitized_text.includes('telemetria') || r.sanitized_text.includes('integrações'));
  });

  test('production_active mantém texto original', () => {
    const r = auditResponse({
      text: 'A operação está parada por manutenção programada.',
      must_avoid_phrases: ['operação parada'],
      data_state: 'production_active',
      narrative_mode: 'operational_status'
    });
    assert.strictEqual(r.sanitized_text, 'A operação está parada por manutenção programada.');
  });

  test('comparação case-insensitive', () => {
    const r = auditResponse({
      text: 'OPERAÇÃO PARADA por falta de dados.',
      must_avoid_phrases: ['operação parada'],
      data_state: 'tenant_empty',
      narrative_mode: 'no_data_consultative'
    });
    assert.strictEqual(r.clean, false);
  });

  test('comparação com acentos', () => {
    const r = auditResponse({
      text: 'Produção descontinuada há semanas.',
      must_avoid_phrases: ['produção descontinuada'],
      data_state: 'tenant_empty',
      narrative_mode: 'no_data_consultative'
    });
    assert.strictEqual(r.clean, false);
  });

  test('lista vazia de frases retorna clean', () => {
    const r = auditResponse({
      text: 'Qualquer texto aqui.',
      must_avoid_phrases: [],
      data_state: 'tenant_empty',
      narrative_mode: 'no_data_consultative'
    });
    assert.strictEqual(r.clean, true);
  });

  console.info(`[TEST] forbiddenNarrativeAuditor — ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
