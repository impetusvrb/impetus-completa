'use strict';

/**
 * Testes do detectIntentAdvanced (NLP leve, sem API).
 * node src/tests/intentDetectionAdvancedScenarios.js
 */
const assert = require('assert');
const { detectIntent, detectIntentAdvanced } = require('../services/intentDetectionService');

function testLegacyDetectIntentUnchanged() {
  const r1 = detectIntent('Qual a situação geral da operação?');
  assert.strictEqual(r1.intent, 'operational_overview');
  const r2 = detectIntent('máquina M3 status');
  assert.strictEqual(r2.intent, 'get_machine_status');
  const r3 = detectIntent('produto P12 bloqueio');
  assert.strictEqual(r3.intent, 'get_product_status');
  const r4 = detectIntent('cargo de João Silva');
  assert.strictEqual(r4.intent, 'get_user_role');
}

function testAdvancedMultiIntent() {
  const t =
    'como está o status da máquina 12 e qual a situação geral do turno hoje no chão de fábrica';
  const { intents, entities } = detectIntentAdvanced(t);
  assert.ok(Array.isArray(intents) && intents.length >= 2);
  assert.ok(intents[0].intent && typeof intents[0].confidence === 'number');
  const names = intents.map((i) => i.intent);
  assert.ok(
    names.includes('get_machine_status') || names.includes('operational_overview'),
    'espera-se pelo menos intenção de máquina ou visão operacional'
  );
  assert.ok(entities == null || typeof entities === 'object');
}

function testAdvancedUserRole() {
  const { intents } = detectIntentAdvanced('quem tem permissão de aprovar pedidos? cargo do supervisor?');
  const top = intents[0];
  assert.strictEqual(top.intent, 'get_user_role');
  assert.ok(top.confidence > 0.4);
}

function testGenericEmpty() {
  const a = detectIntentAdvanced('');
  assert.strictEqual(a.intents[0].intent, 'generic');
  const b = detectIntentAdvanced('   ');
  assert.strictEqual(b.intents[0].intent, 'generic');
}

function testProductBoost() {
  const { intents } = detectIntentAdvanced('lote 404 bloqueio qualidade reprovado NQA?');
  const hasProduct = intents.some((x) => x.intent === 'get_product_status');
  assert.ok(hasProduct);
}

function testScoresAndConfidenceInRange() {
  const { intents } = detectIntentAdvanced('equipamento parado e sensor disparou');
  for (const i of intents) {
    assert.ok(i.confidence > 0 && i.confidence <= 0.99);
  }
}

const suite = [
  testLegacyDetectIntentUnchanged,
  testAdvancedMultiIntent,
  testAdvancedUserRole,
  testGenericEmpty,
  testProductBoost,
  testScoresAndConfidenceInRange
];

(async () => {
  let failed = false;
  for (const t of suite) {
    try {
      t();
      console.log('OK', t.name);
    } catch (e) {
      failed = true;
      console.error('FAIL', t.name, e);
    }
  }
  if (failed) process.exit(1);
  console.log('intentDetectionAdvancedScenarios: all passed');
})();
