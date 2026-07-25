/**
 * FIN-CERT-001 — Contract certification matrix.
 */
import {
  FINANCE_READY_CONTRACTS,
  validateFinanceReadyContracts
} from '../../readiness/finance/contracts/financeReadyContracts.js';
import {
  FINANCE_PUBLIC_CONTRACTS,
  validateFinancePublicContracts
} from '../../../domains/finance/contracts/financePublicContracts.js';
import {
  PLATFORM_PREDICTION_PUBLIC_API,
  validatePlatformPredictionPublicApi
} from '../../prediction/public-api/platformPredictionPublicApi.js';
import {
  ENTERPRISE_PREDICTION_CONTRACT,
  validateEnterprisePredictionContracts
} from '../../prediction/contracts/enterprisePredictionContracts.js';
import { validatePlatformPredictionCertification } from '../../prediction/certification/platformPredictionCertification.js';

const readyById = Object.fromEntries(FINANCE_READY_CONTRACTS.map((contract) => [contract.id, contract]));

export const FINANCE_CERTIFIED_CONTRACTS = Object.freeze([
  Object.freeze({
    id: 'finance.driver_rate.v1',
    version: readyById['finance.driver_rate.v1']?.version,
    owner: 'finance_driver_model',
    provider: 'FIN-READY-001',
    direction: 'consumed_and_exposed',
    compatibility: 'Economic Intelligence · Twin · What-if',
    status: 'CERTIFIED'
  }),
  Object.freeze({
    id: 'finance.asset_cost_map.v1',
    version: readyById['finance.asset_cost_map.v1']?.version,
    owner: 'finance_asset_cost_map',
    provider: 'FIN-READY-001',
    direction: 'consumed_and_exposed',
    compatibility: 'Economic Intelligence · Financial Twin',
    status: 'CERTIFIED'
  }),
  Object.freeze({
    id: 'finance.wms_valuation.v1',
    version: readyById['finance.wms_valuation.v1']?.version,
    owner: 'finance_wms_valuation',
    provider: 'FIN-READY-001',
    direction: 'consumed_and_exposed',
    compatibility: 'WMS quantities preserved · Smart Costing · What-if',
    status: 'CERTIFIED'
  }),
  Object.freeze({
    id: PLATFORM_PREDICTION_PUBLIC_API.id,
    version: '1',
    owner: 'Enterprise Prediction Platform',
    provider: 'PRED-BASE-002',
    direction: 'consumed',
    compatibility: `${ENTERPRISE_PREDICTION_CONTRACT.id}@${ENTERPRISE_PREDICTION_CONTRACT.version}`,
    status: 'CERTIFIED'
  }),
  Object.freeze({
    id: ENTERPRISE_PREDICTION_CONTRACT.id,
    version: ENTERPRISE_PREDICTION_CONTRACT.version,
    owner: 'Enterprise Prediction Platform',
    provider: 'PRED-BASE-001 / PRED-BASE-002',
    direction: 'consumed',
    compatibility: 'forecast_prediction lane + mandatory confidence',
    status: 'CERTIFIED'
  }),
  Object.freeze({
    id: 'dashboard.costs',
    version: 'operational-api/current',
    owner: 'Platform / Dashboard',
    provider: 'industrialCostService',
    direction: 'consumed',
    compatibility: 'Finance Hub · Economic Intelligence',
    status: 'CERTIFIED'
  }),
  Object.freeze({
    id: 'dashboard.financialLeakage',
    version: 'operational-api/current',
    owner: 'Platform / Dashboard',
    provider: 'financialLeakageDetectorService',
    direction: 'consumed',
    compatibility: 'Finance Hub · Economic Intelligence · What-if',
    status: 'CERTIFIED'
  }),
  Object.freeze({
    id: 'finance.domain.workspace',
    version: '1.0.0',
    owner: 'Finance Domain',
    provider: 'FIN-EVOLVE-001',
    direction: 'exposed',
    compatibility: 'EOX /app/finance',
    status: 'CERTIFIED'
  }),
  Object.freeze({
    id: 'finance.domain.navigation',
    version: '1.0.0',
    owner: 'Finance Domain',
    provider: 'FIN-EVOLVE-001A',
    direction: 'exposed',
    compatibility: 'VIEW_FINANCIAL + official deep-links',
    status: 'CERTIFIED'
  })
]);

export function getFinanceCertifiedContract(id) {
  return FINANCE_CERTIFIED_CONTRACTS.find((contract) => contract.id === id) || null;
}

export function validateFinanceContractCertification() {
  const required = [
    'finance.driver_rate.v1',
    'finance.asset_cost_map.v1',
    'finance.wms_valuation.v1',
    'platform.prediction.public_api.v1'
  ];
  const parts = [
    validateFinanceReadyContracts(),
    validateFinancePublicContracts(),
    validateEnterprisePredictionContracts(),
    validatePlatformPredictionPublicApi(),
    validatePlatformPredictionCertification()
  ];
  const issues = parts.flatMap((part) => part.issues || []);
  const ids = new Set();

  for (const contract of FINANCE_CERTIFIED_CONTRACTS) {
    if (ids.has(contract.id)) issues.push(`duplicate contract ${contract.id}`);
    ids.add(contract.id);
    if (!contract.version || !contract.owner || !contract.provider || !contract.compatibility) {
      issues.push(`${contract.id}: incomplete metadata`);
    }
    if (contract.status !== 'CERTIFIED') issues.push(`${contract.id}: not certified`);
  }
  for (const id of required) {
    if (!ids.has(id)) issues.push(`missing required contract ${id}`);
  }
  for (const contract of FINANCE_PUBLIC_CONTRACTS.filter((item) => item.version)) {
    const certified = getFinanceCertifiedContract(contract.contractId);
    if (certified && certified.version !== contract.version) {
      issues.push(`${contract.contractId}: version mismatch`);
    }
  }

  return {
    valid: parts.every((part) => part.valid) && issues.length === 0,
    issues,
    count: FINANCE_CERTIFIED_CONTRACTS.length,
    requiredCertified: required.every((id) => ids.has(id))
  };
}

