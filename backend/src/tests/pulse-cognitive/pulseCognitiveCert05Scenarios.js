#!/usr/bin/env node
/**
 * CERT-PULSE-05 — Certificação final: memória organizacional e encerramento do Pulse RH.
 */
'use strict';

const assert = require('assert');
const path = require('path');

const root = path.join(__dirname, '../..');

function ok(name) {
  console.log(`  ✓ ${name}`);
}

async function run() {
  console.log('CERT-PULSE-05 pulse organizational memory & closure\n');

  const similar = require(path.join(root, 'services/pulseCognitive/memory/similarCaseSearch'));
  const sig = similar.buildSignatureFromContext({
    pulse_index: 42,
    organizational_state: 'at_risk_team',
    pattern_codes: ['disengagement_risk']
  });
  const fp = similar.buildFingerprint(sig);
  assert.ok(fp.includes('40'));
  assert.ok(fp.includes('at_risk_team'));
  ok('Fingerprint de casos semelhantes');

  const evidence = require(path.join(root, 'services/pulseCognitive/memory/evidenceRecommendations'));
  const empty = evidence.buildEvidenceRecommendations([], {});
  assert.strictEqual(empty.has_recommendations, false);
  assert.ok(empty.message.includes('Não existem evidências suficientes'));
  ok('IA sabe quando não sabe (sem casos semelhantes)');

  const withCases = evidence.buildEvidenceRecommendations(
    [
      {
        recorded_at: '2025-03-15',
        scope_label: 'Produção Linha B',
        human_actions: ['Treinamento', 'Redistribuição operacional'],
        outcome_delta_percent: 21,
        similarity_score: 0.72,
        human_validated: true
      }
    ],
    { pulse_index: 44 }
  );
  assert.strictEqual(withCases.has_recommendations, true);
  assert.ok(withCases.similar_cases[0].disclaimer.includes('não constitui previsão'));
  ok('Recomendações apenas com evidência histórica');

  const memory = require(path.join(root, 'services/pulseCognitive/memory/organizationalMemoryService'));
  assert.strictEqual(typeof memory.consultOrganizationalMemory, 'function');
  assert.strictEqual(typeof memory.captureSnapshot, 'function');
  ok('OrganizationalMemoryService disponível');

  const facade = require(path.join(root, 'services/pulseCognitive/memory/organizationalMemoryFacade'));
  assert.strictEqual(typeof facade.consultMemory, 'function');
  const contract = facade.getArchitectureContractSummary();
  assert.strictEqual(contract.pulse_completed, true);
  assert.strictEqual(contract.core_frozen, true);
  assert.ok(contract.statement.includes('arquiteturalmente concluído'));
  ok('Contrato arquitetural: Pulse encerrado');

  const gov = require(path.join(root, 'services/pulseCognitive/memory/governanceAudit'));
  const audit = await gov.auditPulseGovernance();
  assert.strictEqual(audit.acceptance_criteria.pulse_completed, true);
  assert.strictEqual(audit.acceptance_criteria.event_ingestion_is_single_extension_point, true);
  assert.strictEqual(audit.acceptance_criteria.no_new_indexes, true);
  assert.strictEqual(audit.acceptance_criteria.regressions_detected, 0);
  ok('Governança auditada — critérios de aceite');

  const timeline = require(path.join(root, 'services/pulseCognitive/memory/consolidatedTimeline'));
  assert.strictEqual(typeof timeline.buildConsolidatedOrganizationalTimeline, 'function');
  ok('Timeline consolidada (somente leitura)');

  const eventIngestion = require(path.join(root, 'services/pulseCognitive/eventIngestion'));
  assert.strictEqual(typeof eventIngestion.ingestHumanEvent, 'function');
  ok('eventIngestion permanece ponto único de extensão');

  const indexCalc = require(path.join(root, 'services/pulseCognitive/indexCalculator'));
  const { DIMENSIONS } = require(path.join(root, 'services/pulseCognitive/constants'));
  assert.strictEqual(DIMENSIONS.length, 9);
  const sum = DIMENSIONS.reduce((s, d) => s + d.weight, 0);
  assert.ok(Math.abs(sum - 1) < 0.01);
  ok('9 dimensões — pesos inalterados');

  const pulseService = require(path.join(root, 'services/pulseService'));
  assert.strictEqual(typeof pulseService.submitSelfEvaluation, 'function');
  ok('Pulse legado preservado');

  const routes = require(path.join(root, 'routes/pulseCognitive'));
  assert.ok(routes);
  ok('Rotas memória organizacional montadas');

  console.log('\nCERT-PULSE-05: certificação final concluída — Pulse RH encerrado como módulo.\n');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
