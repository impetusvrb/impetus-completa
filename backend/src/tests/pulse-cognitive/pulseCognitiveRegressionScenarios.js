#!/usr/bin/env node
/**
 * CERT-PULSE-02 — Testes de regressão (módulo aditivo + compatibilidade Pulse legado).
 */
'use strict';

const assert = require('assert');
const path = require('path');

const root = path.join(__dirname, '../..');

function ok(name) {
  console.log(`  ✓ ${name}`);
}

function run() {
  console.log('CERT-PULSE-02 pulse cognitive regression\n');

  // 1 — Serviços carregam sem erro
  const perception = require(path.join(root, 'services/pulseCognitive/perceptionLayer'));
  const correlation = require(path.join(root, 'services/pulseCognitive/humanCorrelationEngine'));
  const indexCalc = require(path.join(root, 'services/pulseCognitive/indexCalculator'));
  const stateEngine = require(path.join(root, 'services/pulseCognitive/stateEngine'));
  const patternDetection = require(path.join(root, 'services/pulseCognitive/patternDetection'));
  const cognitiveMotor = require(path.join(root, 'services/pulseCognitive/cognitiveMotor'));
  const hooks = require(path.join(root, 'services/pulseCognitive/hooks'));
  const pulseCognitive = require(path.join(root, 'services/pulseCognitive/pulseCognitiveService'));
  ok('Todos os módulos pulseCognitive carregam');

  // 2 — Pulse legado intacto
  const pulseService = require(path.join(root, 'services/pulseService'));
  assert.strictEqual(typeof pulseService.submitSelfEvaluation, 'function');
  assert.strictEqual(typeof pulseService.triggerCampaignForUsers, 'function');
  assert.strictEqual(pulseService.isSubjectToPulse('operador'), true);
  assert.strictEqual(pulseService.isSubjectToPulse('rh'), false);
  ok('pulseService legado exporta API inalterada');

  const pulseAI = require(path.join(root, 'services/pulseAI'));
  assert.strictEqual(typeof pulseAI.generateSelfFeedbackMessage, 'function');
  ok('pulseAI legado intacto');

  // 3 — Algoritmo índice
  const mockPerception = {
    ok: true,
    operational: { tpm_incidents_recorded: 3, proacao_proposals_submitted: 2, intelligent_registrations: 1 },
    human_signals: {
      time_clock: { records: 20, absences: 1, delays: 2, overtime_minutes: 120, absence_rate: 0.05, delay_rate: 0.1 },
      tasks_completed: 4,
      communications_read: 5,
      tenure_days: 400,
      latest_self_evaluation: { efficiency: 4, confidence: 3, proactivity: 4, synergy: 4 }
    }
  };
  const corr = correlation.correlateHumanSignals(mockPerception);
  assert.ok(Array.isArray(corr.correlations));
  const idx = indexCalc.computePulseIndex(mockPerception, corr);
  assert.ok(idx.pulse_index >= 0 && idx.pulse_index <= 100);
  assert.ok(idx.dimensions.engagement != null);
  ok(`Pulse Index calculado: ${idx.pulse_index}`);

  // 4 — Estado organizacional inferido (nunca manual)
  const state = stateEngine.inferOrganizationalState(idx, corr);
  assert.ok(state.state_code);
  assert.ok(state.evidence);
  assert.strictEqual(state.inference.assistive_only, true);
  ok(`Estado inferido: ${state.state_code}`);

  // 5 — Padrões de escopo
  const scope = patternDetection.detectScopePatterns(
    [{ pulse_index: 45, dimensions: { engagement: 40, participation: 38, evolution: 42 }, patterns: [{ code: 'disengagement_risk', severity: 'elevated', confidence: 0.7 }] }],
    'Setor A'
  );
  assert.ok(scope.patterns.length >= 0);
  ok('Detecção de padrões por escopo');

  // 6 — Motor cognitivo + governança
  const understanding = cognitiveMotor.buildOrganizationalUnderstanding(mockPerception, idx, corr);
  assert.ok(understanding.governance.human_in_the_loop);
  assert.ok(understanding.governance.assistive_only);
  ok('Governança human-in-the-loop presente');

  // 7 — Hooks aditivos não quebram se desligados
  process.env.IMPETUS_PULSE_COGNITIVE = 'off';
  hooks.notifyHumanEvent('00000000-0000-0000-0000-000000000001', { event_type: 'test' });
  ok('Hook silencioso com IMPETUS_PULSE_COGNITIVE=off');
  delete process.env.IMPETUS_PULSE_COGNITIVE;

  // 8 — Rotas cognitivas registradas
  const pulseCognitiveRoutes = require(path.join(root, 'routes/pulseCognitive'));
  assert.ok(pulseCognitiveRoutes);
  ok('Router pulseCognitive exportado');

  // 9 — GOVERNANCE export
  assert.strictEqual(pulseCognitive.GOVERNANCE.assistive_only, true);
  ok('Facade pulseCognitiveService com GOVERNANCE');

  console.log('\nCERT-PULSE-02: todos os testes de regressão passaram.\n');
}

run();
