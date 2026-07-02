'use strict';

/**
 * CERT-VOICE-01 — testes do Conversation Context Classifier
 * Run: node backend/src/conversationContext/conversationContextClassifier.test.js
 */

const assert = require('assert');
const { classifyConversationContext } = require('./conversationContextClassifier');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log('conversationContextClassifier');

test('detecta contexto reunião', () => {
  const r = classifyConversationContext('Vamos iniciar uma reunião com a diretoria', { role: 'ceo' });
  assert.strictEqual(r.profile_id, 'meeting');
  assert.strictEqual(r.subcontext, 'meeting');
});

test('detecta modo apresentação', () => {
  const r = classifyConversationContext('Ative o modo apresentação', { role: 'ceo' });
  assert.strictEqual(r.profile_id, 'presentation');
});

test('detecta contexto operacional', () => {
  const r = classifyConversationContext('Qual máquina está parada na linha A?', { role: 'operador' });
  assert.strictEqual(r.context_type, 'operational');
});

test('detecta contexto técnico', () => {
  const r = classifyConversationContext('Como substituir o rolamento desta máquina?', { role: 'mecanico' });
  assert.strictEqual(r.context_type, 'technical');
});

test('flag modoApresentacao sem frase', () => {
  const { detectExecutiveSubcontext } = require('./executiveConversationContext');
  const r = detectExecutiveSubcontext('', { modoApresentacao: true, user: { role: 'ceo' } });
  assert.strictEqual(r.subcontext, 'presentation');
});

console.log('OK');
