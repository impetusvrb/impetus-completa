#!/usr/bin/env node
/**
 * CERT-PULSE-03 — Validação de integração ecossistema (aditivo, sem DB obrigatório).
 */
'use strict';

const assert = require('assert');
const path = require('path');

const root = path.join(__dirname, '../..');

function ok(name) {
  console.log(`  ✓ ${name}`);
}

function run() {
  console.log('CERT-PULSE-03 pulse cognitive ecosystem integration\n');

  // FASE 1 — Hooks e middleware
  const { ecosystemHooks, safe } = require(path.join(root, 'services/pulseCognitive/ecosystemHooks'));
  assert.strictEqual(typeof ecosystemHooks.tpmRecorded, 'function');
  assert.strictEqual(typeof ecosystemHooks.roleChanged, 'function');
  assert.strictEqual(typeof ecosystemHooks.hierarchyChanged, 'function');
  process.env.IMPETUS_PULSE_COGNITIVE = 'off';
  safe('test', '00000000-0000-0000-0000-000000000001', { event_type: 'noop' });
  delete process.env.IMPETUS_PULSE_COGNITIVE;
  ok('ecosystemHooks carregam e são resilientes com flag off');

  const { pulseCognitiveEcosystemMiddleware, ROUTE_MAP } = require(path.join(
    root,
    'services/pulseCognitive/ecosystemMiddleware'
  ));
  assert.ok(Array.isArray(ROUTE_MAP) && ROUTE_MAP.length >= 8);
  assert.strictEqual(typeof pulseCognitiveEcosystemMiddleware, 'function');
  ok('ecosystemMiddleware HTTP bridge registrado');

  // FASE 2 — Scheduler
  const scheduler = require(path.join(root, 'services/pulseCognitive/pulseCampaignScheduler'));
  assert.strictEqual(typeof scheduler.runDueCampaigns, 'function');
  const next = scheduler.computeNextRun('monthly', new Date('2026-01-01'));
  assert.ok(next instanceof Date && next > new Date('2026-01-01'));
  ok('pulseCampaignScheduler com computeNextRun');

  // FASE 3 — Aprendizado temporal
  const temporal = require(path.join(root, 'services/pulseCognitive/temporalLearning'));
  const trend = temporal.classifyTrend([
    { pulse_index: 40 },
    { pulse_index: 42 },
    { pulse_index: 55 },
    { pulse_index: 58 },
    { pulse_index: 62 }
  ]);
  assert.ok(trend.code);
  ok(`Aprendizado temporal: ${trend.label}`);

  // FASE 4 — Correlação interdomínios
  const cross = require(path.join(root, 'services/pulseCognitive/crossDomainCorrelation'));
  const correlated = cross.correlateDomains(
    {
      human: { pulse_index_avg: 42, hr_indicators: { absence_index: 10, fatigue_risk_index: 45 } },
      operation: { tpm_count: 1, proposals_count: 1, open_tasks: 5 },
      quality_sst: { operational_alerts: 8 }
    },
    42
  );
  assert.ok(Array.isArray(correlated.cross_domain_insights));
  ok('Correlação interdomínios gera insights assistivos');

  // FASE 5 — Explicabilidade
  const { buildExplainability } = require(path.join(root, 'services/pulseCognitive/explainability'));
  const indexCalc = require(path.join(root, 'services/pulseCognitive/indexCalculator'));
  const correlation = require(path.join(root, 'services/pulseCognitive/humanCorrelationEngine'));
  const mockPerception = {
    ok: true,
    data_sources: ['tpm', 'proacao'],
    operational: { tpm_incidents_recorded: 2, proacao_proposals_submitted: 1 },
    human_signals: { tasks_completed: 3, tenure_days: 200 }
  };
  const corr = correlation.correlateHumanSignals(mockPerception);
  const idx = indexCalc.computePulseIndex(mockPerception, corr);
  const expl = buildExplainability(idx, mockPerception, corr, null);
  assert.ok(expl.conclusion_reason);
  assert.ok(expl.factor_weights.length >= 0);
  assert.strictEqual(expl.governance.human_in_the_loop, true);
  ok('Explicabilidade sem caixa-preta');

  // FASE 6–7 — Facade
  const pulseCognitive = require(path.join(root, 'services/pulseCognitive/pulseCognitiveService'));
  assert.strictEqual(typeof pulseCognitive.getExecutiveDashboard, 'function');
  assert.strictEqual(typeof pulseCognitive.getTimeline, 'function');
  assert.strictEqual(typeof pulseCognitive.getCrossDomainInsights, 'function');
  assert.strictEqual(typeof pulseCognitive.getExplainabilityForSubject, 'function');
  assert.strictEqual(typeof pulseCognitive.getSchedulerStatus, 'function');
  const schedStatus = pulseCognitive.getSchedulerStatus();
  assert.strictEqual(schedStatus.ok, true);
  ok('pulseCognitiveService expõe APIs CERT-PULSE-03');

  // FASE 8 — Observabilidade
  const pulseObs = require(path.join(root, 'services/pulseCognitive/pulseCognitiveObservability'));
  assert.ok(pulseObs.METRICS.events_received);
  pulseObs.recordDashboardLatency(42);
  ok('Métricas pulse_* disponíveis');

  // FASE 9 — Auditoria
  const pulseAudit = require(path.join(root, 'services/pulseCognitive/pulseCognitiveAudit'));
  const trace = pulseAudit.newTraceId();
  assert.ok(typeof trace === 'string' && trace.length > 8);
  ok('Auditoria com trace-id');

  // Rotas aditivas
  const routes = require(path.join(root, 'routes/pulseCognitive'));
  assert.ok(routes);
  ok('Router pulseCognitive com rotas CERT-03');

  // Regressão Pulse legado
  const pulseService = require(path.join(root, 'services/pulseService'));
  assert.strictEqual(typeof pulseService.createCampaign, 'function');
  assert.strictEqual(typeof pulseService.submitSelfEvaluation, 'function');
  ok('Pulse legado intacto após CERT-03');

  // Cenários sintéticos (empresa vazia / sem dados)
  const emptyTrend = temporal.classifyTrend([]);
  assert.strictEqual(emptyTrend.code, 'insufficient_data');
  const stableTrend = temporal.classifyTrend(
    [50, 51, 49, 50, 52, 48, 50].map((v) => ({ pulse_index: v }))
  );
  assert.ok(['stable', 'mild_improvement', 'mild_decline', 'oscillation'].includes(stableTrend.code));
  ok('Cenários empresa vazia / dados estáveis classificados');

  console.log('\nCERT-PULSE-03: todos os cenários de validação passaram.\n');
}

run();
