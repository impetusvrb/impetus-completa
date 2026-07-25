/**
 * FIN-EVOLVE-2.4 — Predictive Financial Intelligence.
 * Finance consumes the certified Enterprise Prediction Platform only.
 */
export const FIN_EVOLVE_24_PHASE = 'FIN-EVOLVE-2.4';
export const FIN_EVOLVE_24_PRINCIPLE = 'PREDICT WITHOUT DECIDING';

export const FIN_EVOLVE_24_SCOPE = Object.freeze({
  implementsPredictionEngine: false,
  implementsStatisticalModel: false,
  implementsMachineLearning: false,
  implementsGenerativeAi: false,
  mutatesOperationalState: false,
  executesActions: false,
  altersEconomicEngine: false,
  altersFinancialTwin: false,
  altersWhatIf: false,
  includesEnergy: false,
  platformConsumerOnly: true
});

export const FINANCIAL_PREDICTION_TARGETS = Object.freeze([
  Object.freeze({
    id: 'operational_cost',
    label: 'Custo operacional',
    platformMetric: 'custo_operacional',
    currentKey: 'operationalCost',
    unit: 'BRL',
    coverage: 'custos'
  }),
  Object.freeze({
    id: 'unit_cost',
    label: 'Custo unitário',
    platformMetric: 'custo_operacional',
    currentKey: 'unitCost',
    unit: 'BRL',
    coverage: 'custos'
  }),
  Object.freeze({
    id: 'leakage',
    label: 'Leakage',
    platformMetric: 'prejuizo',
    currentKey: 'leakage',
    unit: 'BRL',
    coverage: 'leakage'
  }),
  Object.freeze({
    id: 'valuation',
    label: 'Valuation',
    platformMetric: 'custo_operacional',
    currentKey: 'valuation',
    unit: 'BRL',
    coverage: 'custos'
  }),
  Object.freeze({
    id: 'economic_efficiency',
    label: 'Eficiência económica',
    platformMetric: 'eficiencia',
    currentKey: 'efficiency',
    unit: '%',
    coverage: 'producao'
  }),
  Object.freeze({
    id: 'cost_by_asset',
    label: 'Custo por ativo',
    platformMetric: 'custo_operacional',
    currentKey: 'costByAsset',
    unit: 'BRL',
    coverage: 'twin'
  }),
  Object.freeze({
    id: 'cost_by_line',
    label: 'Custo por linha',
    platformMetric: 'custo_operacional',
    currentKey: 'costByLine',
    unit: 'BRL',
    coverage: 'twin'
  }),
  Object.freeze({
    id: 'cost_by_cost_center',
    label: 'Custo por centro de custo',
    platformMetric: 'custo_operacional',
    currentKey: 'costByCostCenter',
    unit: 'BRL',
    coverage: 'custos'
  })
]);

export const FINANCIAL_PREDICTION_EXCLUDED_TARGETS = Object.freeze([
  Object.freeze({
    id: 'energy',
    label: 'Energia',
    gap: 'GAP-PB-003',
    reason: 'Cobertura PARTIAL — fora da Wave 1'
  })
]);

export const FINANCIAL_PREDICTION_LANES = Object.freeze({
  OBSERVED: 'observed_fact',
  SIMULATED: 'simulated_scenario',
  FORECAST: 'forecast_prediction'
});

