'use strict';

/**
 * CERT-VOICE-02 — testes Executive Presentation Context
 * Run: node backend/src/conversationContext/executivePresentationContext.test.js
 */

const assert = require('assert');
const {
  resolveExecutivePresentationContext,
  buildPresentationContext,
  detectPresentationIntent,
  applyPresentationPanelHints,
  clearStoredPresentation
} = require('./executivePresentationContext');

const CEO = { id: 99, company_id: 'co-1', role: 'ceo', dashboard_profile: 'ceo_executive' };

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log('executivePresentationContext');

test('activa apresentação por frase ANAM', () => {
  clearStoredPresentation(CEO);
  const ctx = resolveExecutivePresentationContext(CEO, {
    queryText: 'Vamos iniciar uma apresentação dos indicadores',
    channel: 'anam_voice'
  });
  assert.strictEqual(ctx.enabled, true);
  assert.strictEqual(ctx.presentation_level, 'executive');
});

test('dashboard informa presentation requested', () => {
  clearStoredPresentation(CEO);
  const ctx = resolveExecutivePresentationContext(CEO, {
    presentationRequested: true,
    presentationLevel: 'internal',
    channel: 'dashboard'
  });
  assert.strictEqual(ctx.enabled, true);
  assert.strictEqual(ctx.presentation_level, 'internal');
  assert.strictEqual(ctx.allow_details, true);
});

test('nível board detectado na frase', () => {
  const intent = detectPresentationIntent('Preparar apresentação para o conselho');
  assert.strictEqual(intent.action, 'enable');
  assert.strictEqual(intent.level, 'board');
});

test('SmartPanel prioriza gráficos em apresentação', () => {
  const plan = applyPresentationPanelHints(
    { type: 'table', datasets: ['chat', 'kpis'], title: 'Test' },
    buildPresentationContext('executive')
  );
  assert.notStrictEqual(plan.type, 'table');
  assert.ok(!plan.datasets.includes('chat'));
});

console.log('OK');
