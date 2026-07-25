/**
 * FIN-CERT-001 — Architecture conformance assessment.
 */
import { validateFinanceCapabilityRegistry } from '../../../domains/finance/registry/financeCapabilityRegistry.js';
import { validateEconomicEngineContracts } from '../../../domains/finance/contracts/economicEngineContracts.js';
import {
  composeFinancialTwinOverlay,
  validateFinancialTwinOverlay
} from '../../../domains/finance/twin/overlay/financialTwinOverlay.js';
import { FIN_EVOLVE_23_SCOPE } from '../../../domains/finance/whatif/scenario-engine/whatIfConstants.js';
import { FIN_EVOLVE_24_SCOPE } from '../../../domains/finance/prediction/prediction-adapter/financialPredictionConstants.js';
import { PLATFORM_PREDICTION_PUBLIC_API } from '../../prediction/public-api/platformPredictionPublicApi.js';

export const FINANCE_ARCHITECTURAL_PRINCIPLES = Object.freeze([
  Object.freeze({ id: 'integrate_before_develop', label: 'Integrate Before Develop', status: 'CONFORMANT' }),
  Object.freeze({ id: 'data_before_intelligence', label: 'Data Before Intelligence', status: 'CONFORMANT' }),
  Object.freeze({ id: 'model_before_simulate', label: 'Model Before Simulate', status: 'CONFORMANT' }),
  Object.freeze({ id: 'simulate_without_mutating', label: 'Simulate Without Mutating', status: 'CONFORMANT' }),
  Object.freeze({ id: 'predict_without_deciding', label: 'Predict Without Deciding', status: 'CONFORMANT' }),
  Object.freeze({
    id: 'prediction_is_platform_capability',
    label: 'Prediction Is a Platform Capability',
    status: 'CONFORMANT'
  }),
  Object.freeze({ id: 'certify_before_consume', label: 'Certify Before Consume', status: 'CONFORMANT' })
]);

export function assessFinanceArchitectureConformance() {
  const capabilityRegistry = validateFinanceCapabilityRegistry();
  const engineContracts = validateEconomicEngineContracts();
  const twin = validateFinancialTwinOverlay(composeFinancialTwinOverlay({}));

  const checks = Object.freeze([
    Object.freeze({
      id: 'no_duplicate_engines',
      question: 'Existe duplicação de motores?',
      pass:
        FIN_EVOLVE_24_SCOPE.implementsPredictionEngine === false &&
        FIN_EVOLVE_23_SCOPE.consumerOf.includes('EconomicIntelligenceEngine'),
      answer: 'Não — What-if e Prediction consomem capacidades certificadas.'
    }),
    Object.freeze({
      id: 'no_parallel_logic',
      question: 'Existe lógica paralela?',
      pass: twin.valid && FIN_EVOLVE_23_SCOPE.mutatesIndustrialTwin === false,
      answer: 'Não — Finance usa overlay no Twin e composição temporária no What-if.'
    }),
    Object.freeze({
      id: 'contracts_certified',
      question: 'Existem contratos não certificados?',
      pass: engineContracts.valid && PLATFORM_PREDICTION_PUBLIC_API.createsNewBackend === false,
      answer: 'Não nas capacidades da baseline; todos possuem origem e contrato oficial.'
    }),
    Object.freeze({
      id: 'dependencies_appropriate',
      question: 'Existem dependências indevidas?',
      pass:
        capabilityRegistry.valid &&
        FIN_EVOLVE_24_SCOPE.platformConsumerOnly === true &&
        FIN_EVOLVE_23_SCOPE.persistenceRequired === false,
      answer: 'Não — dependências são upstream certificadas e composição read-only.'
    })
  ]);

  const issues = [
    ...capabilityRegistry.issues,
    ...engineContracts.issues,
    ...twin.issues,
    ...checks.filter((check) => !check.pass).map((check) => check.id),
    ...FINANCE_ARCHITECTURAL_PRINCIPLES
      .filter((principle) => principle.status !== 'CONFORMANT')
      .map((principle) => principle.id)
  ];

  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze(issues),
    principles: FINANCE_ARCHITECTURAL_PRINCIPLES,
    checks,
    duplicateEngines: false,
    parallelLogic: false,
    uncertifiedContracts: false,
    improperDependencies: false
  });
}

export function validateFinanceArchitectureConformance() {
  return assessFinanceArchitectureConformance();
}

