#!/usr/bin/env node
/**
 * CERT-PULSE-04 — Validação de calibração cognitiva (aditivo, sem DB obrigatório).
 */
'use strict';

const assert = require('assert');
const path = require('path');

const root = path.join(__dirname, '../..');

function ok(name) {
  console.log(`  ✓ ${name}`);
}

function run() {
  console.log('CERT-PULSE-04 pulse cognitive calibration certification\n');

  const dimensionAudit = require(path.join(root, 'services/pulseCognitive/calibration/dimensionAudit'));
  const audit = dimensionAudit.buildDimensionAuditMatrix();
  assert.strictEqual(audit.dimensions.length, 9);
  assert.strictEqual(audit.weights_frozen, true);
  assert.ok(audit.signal_matrix.length >= 8);
  ok('Auditoria das 9 dimensões com matriz sinal→peso→impacto');

  const weightSim = require(path.join(root, 'services/pulseCognitive/calibration/weightSimulation'));
  const sims = weightSim.runWeightSimulations();
  assert.strictEqual(sims.summary.weights_modified, false);
  assert.strictEqual(sims.scenarios.length, 8);
  ok(`${sims.summary.coherent_scenarios}/${sims.scenarios.length} cenários coerentes`);

  const calAnalysis = require(path.join(root, 'services/pulseCognitive/calibration/calibrationAnalysis'));
  const enriched = calAnalysis.enrichInsightEvidence({
    id: 'test',
    insight_type: 'pattern',
    title: 'Test',
    summary: 'Hipótese',
    confidence: 0.6,
    indicators_used: JSON.stringify([{ key: 'tpm' }]),
    evidence: JSON.stringify([{ type: 'pattern' }]),
    correlations: '[]'
  });
  assert.strictEqual(enriched.validation_bundle.evidence_complete, true);
  assert.strictEqual(enriched.validation_bundle.emit_allowed, true);
  ok('Insights exigem evidências explícitas');

  const blocked = calAnalysis.enrichInsightEvidence({
    id: 'x',
    insight_type: 'pattern',
    title: 'Sem dados',
    summary: '—',
    confidence: 0.2,
    indicators_used: '[]',
    evidence: '[]'
  });
  assert.strictEqual(blocked.validation_bundle.emit_allowed, false);
  ok('Insight sem evidência bloqueado para emissão assertiva');

  const advExpl = require(path.join(root, 'services/pulseCognitive/calibration/advancedExplainability'));
  assert.strictEqual(typeof advExpl.classifyFactor, 'function');
  ok('Explainability avançada disponível');

  const calService = require(path.join(root, 'services/pulseCognitive/calibration/pulseCalibrationService'));
  assert.strictEqual(typeof calService.getFullCalibrationReport, 'function');
  assert.strictEqual(typeof calService.getReliabilityDashboard, 'function');
  ok('Facade pulseCalibrationService exportada');

  const calObs = require(path.join(root, 'services/pulseCognitive/calibration/calibrationObservability'));
  assert.ok(calObs.METRICS.confidence_average);
  calObs.recordHumanValidation();
  ok('Métricas CERT-PULSE-04 registradas');

  const humanVal = require(path.join(root, 'services/pulseCognitive/calibration/humanValidationService'));
  assert.deepStrictEqual(humanVal.VALID_STATUSES, ['confirmed', 'partial', 'rejected']);
  ok('Validação HITL com status canónicos');

  const indexCalc = require(path.join(root, 'services/pulseCognitive/indexCalculator'));
  const correlation = require(path.join(root, 'services/pulseCognitive/humanCorrelationEngine'));
  const crisis = weightSim.SCENARIOS.team_in_crisis.perception;
  const corr = correlation.correlateHumanSignals(crisis);
  const idx = indexCalc.computePulseIndex(crisis, corr);
  assert.ok(idx.pulse_index < 55, `crise deve ter índice baixo, obteve ${idx.pulse_index}`);
  ok(`Cenário crise: índice ${idx.pulse_index} (coerente)`);

  const productive = weightSim.SCENARIOS.highly_productive_team.perception;
  const idx2 = indexCalc.computePulseIndex(productive, correlation.correlateHumanSignals(productive));
  assert.ok(idx2.pulse_index >= 65, `produtiva deve ter índice alto, obteve ${idx2.pulse_index}`);
  ok(`Cenário produtivo: índice ${idx2.pulse_index} (coerente)`);

  const lowData = weightSim.SCENARIOS.low_data_company.perception;
  const idx3 = indexCalc.computePulseIndex(lowData, correlation.correlateHumanSignals(lowData));
  assert.ok(idx3.confidence < 0.55, 'poucos dados devem reduzir confiança');
  ok('Empresa com poucos dados: confiança reduzida');

  const pulseService = require(path.join(root, 'services/pulseService'));
  assert.strictEqual(typeof pulseService.submitSelfEvaluation, 'function');
  ok('Pulse legado intacto');

  const routes = require(path.join(root, 'routes/pulseCognitive'));
  assert.ok(routes);
  ok('Rotas de calibração montadas em pulseCognitive');

  console.log('\nCERT-PULSE-04: todos os cenários de certificação passaram.\n');
}

run();
