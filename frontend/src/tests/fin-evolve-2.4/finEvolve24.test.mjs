import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  FIN_EVOLVE_24_PHASE,
  FIN_EVOLVE_24_PRINCIPLE,
  FIN_EVOLVE_24_SCOPE,
  FINANCIAL_PREDICTION_TARGETS,
  FINANCIAL_PREDICTION_EXCLUDED_TARGETS,
  FINANCIAL_PREDICTION_LANES
} from '../../domains/finance/prediction/prediction-adapter/financialPredictionConstants.js';
import {
  requestFinancialPredictions,
  validateFinancialPrediction,
  validateFinancialPredictionAdapter
} from '../../domains/finance/prediction/prediction-adapter/financialPredictionAdapter.js';
import {
  assessFinancialPredictionDisplayability
} from '../../domains/finance/prediction/confidence/financialPredictionConfidence.js';
import {
  composeFinancialTemporalPerspective,
  comparePredictionWithWhatIf,
  validateFinancialTemporalPerspective
} from '../../domains/finance/prediction/timeline/financialPredictionTimeline.js';
import {
  FINANCE_PREDICTION_EVENTS,
  validateFinancePredictionObservability
} from '../../domains/finance/prediction/observability/financePredictionObservability.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, '../../..');
const sourceRoot = path.join(frontend, 'src/domains/finance/prediction');

function fakeForecastClient(calls) {
  return {
    async getProjections(metric) {
      calls.push(metric);
      return {
        data: {
          metric,
          series: [
            { point: 'agora', value: metric === 'eficiencia' ? 80 : 100 },
            { point: '2d', value: metric === 'eficiencia' ? 84 : 110 }
          ]
        }
      };
    }
  };
}

const currentValues = Object.freeze({
  operationalCost: 1000,
  unitCost: 10,
  leakage: 50,
  valuation: 5000,
  efficiency: 80,
  costByAsset: 250,
  costByLine: 400,
  costByCostCenter: 300
});

test('scope certifica Finance como consumidor sem decisão ou energia', () => {
  assert.equal(FIN_EVOLVE_24_PHASE, 'FIN-EVOLVE-2.4');
  assert.equal(FIN_EVOLVE_24_PRINCIPLE, 'PREDICT WITHOUT DECIDING');
  assert.equal(FIN_EVOLVE_24_SCOPE.platformConsumerOnly, true);
  assert.equal(FIN_EVOLVE_24_SCOPE.implementsPredictionEngine, false);
  assert.equal(FIN_EVOLVE_24_SCOPE.mutatesOperationalState, false);
  assert.equal(FIN_EVOLVE_24_SCOPE.executesActions, false);
  assert.equal(FIN_EVOLVE_24_SCOPE.includesEnergy, false);
});

test('Wave 1 contém apenas alvos autorizados e exclui energia', () => {
  assert.equal(FINANCIAL_PREDICTION_TARGETS.length, 8);
  assert.equal(FINANCIAL_PREDICTION_TARGETS.some((target) => target.id === 'energy'), false);
  assert.equal(FINANCIAL_PREDICTION_EXCLUDED_TARGETS[0].gap, 'GAP-PB-003');
  assert.equal(validateFinancialPredictionAdapter().valid, true);
});

test('adapter consulta apenas a API certificada e preserva contexto observado', async () => {
  const calls = [];
  const before = structuredClone(currentValues);
  const result = await requestFinancialPredictions({
    forecastingClient: fakeForecastClient(calls),
    currentValues,
    emitEvents: false
  });

  assert.equal(result.ok, true);
  assert.equal(result.api, 'platform.prediction.public_api.v1');
  assert.equal(result.contract, 'platform.prediction.v0');
  assert.equal(result.predictions.length, 8);
  assert.deepEqual(currentValues, before);
  assert.equal(calls.includes('energia'), false);
  assert.deepEqual([...new Set(calls)].sort(), ['custo_operacional', 'eficiencia', 'prejuizo']);
  for (const prediction of result.predictions) {
    assert.equal(prediction.semantic_lane, FINANCIAL_PREDICTION_LANES.FORECAST);
    assert.equal(prediction.origin, 'platform.prediction.public_api.v1');
    assert.equal(prediction.mutatesOperationalState, false);
    assert.equal(prediction.executesActions, false);
    assert.equal(validateFinancialPrediction(prediction).valid, true);
    assert.equal(assessFinancialPredictionDisplayability(prediction).displayable, true);
  }
});

test('previsão sem confiança ou explicação é rejeitada para exibição', () => {
  const assessment = assessFinancialPredictionDisplayability({
    kind: 'financial_prediction',
    semantic_lane: 'forecast_prediction',
    predicted_value: 1,
    horizon: '2d',
    evidence_refs: [],
    limitations: []
  });
  assert.equal(assessment.displayable, false);
  assert.ok(assessment.issues.length > 0);
});

test('timeline mantém observed, simulated e forecast em lanes distintas', async () => {
  const result = await requestFinancialPredictions({
    forecastingClient: fakeForecastClient([]),
    currentValues,
    emitEvents: false
  });
  const simulatedComparison = {
    scenarioId: 'scenario-test',
    metrics: [
      { id: 'total_cost', current: 1000, simulated: 1200, delta: 200 },
      { id: 'unit_cost', current: 10, simulated: 12, delta: 2 },
      { id: 'efficiency', current: 80, simulated: 78, delta: -2 }
    ]
  };
  const perspective = composeFinancialTemporalPerspective({
    observed: currentValues,
    simulatedComparison,
    predictions: result.predictions
  });
  assert.equal(validateFinancialTemporalPerspective(perspective).valid, true);
  assert.deepEqual(
    perspective.lanes.map((lane) => lane.id),
    ['observed_fact', 'simulated_scenario', 'forecast_prediction']
  );
  const comparison = comparePredictionWithWhatIf(result.predictions, simulatedComparison);
  assert.ok(comparison.length >= 3);
  assert.equal(comparison.every((row) => row.explanation.conceptsMixed === false), true);
});

test('observabilidade contém os cinco eventos obrigatórios', () => {
  assert.deepEqual(FINANCE_PREDICTION_EVENTS, [
    'finance.prediction.requested',
    'finance.prediction.received',
    'finance.prediction.displayed',
    'finance.prediction.compared',
    'finance.prediction.rejected'
  ]);
  assert.equal(validateFinancePredictionObservability().valid, true);
});

test('integrações Hub, Twin, What-if e rota de detalhe estão declaradas', () => {
  const hub = fs.readFileSync(
    path.join(frontend, 'src/domains/finance/dashboard/FinanceExecutiveDashboard.jsx'),
    'utf8'
  );
  const twin = fs.readFileSync(
    path.join(frontend, 'src/domains/finance/twin/views/FinanceTwinFinancialView.jsx'),
    'utf8'
  );
  const whatIf = fs.readFileSync(
    path.join(frontend, 'src/domains/finance/whatif/scenario-view/FinanceWhatIfView.jsx'),
    'utf8'
  );
  const app = fs.readFileSync(path.join(frontend, 'src/App.jsx'), 'utf8');
  assert.match(hub, /FinancePredictionCards/);
  assert.match(twin, /FinanceTemporalPerspectivePanel/);
  assert.match(whatIf, /PredictionWhatIfComparisonPanel/);
  assert.match(app, /path="prediction"/);
});

test('domínio Finance não contém motor preditivo paralelo', () => {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (/\.(js|jsx)$/.test(entry.name)) files.push(absolute);
    }
  };
  walk(sourceRoot);
  const content = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(content, /tensorflow|pytorch|linearRegression|trainModel|fitModel/i);
  assert.match(content, /platform\.prediction\.public_api\.v1/);
});

