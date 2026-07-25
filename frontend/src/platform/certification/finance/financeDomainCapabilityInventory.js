/**
 * FIN-CERT-001 — Consolidated Finance domain capability inventory.
 * Declarative certification view over existing certified components.
 */
import { FIN_CERT_001_COMPLETED_PROGRAMS } from './finCert001Constants.js';

export const FINANCE_CAPABILITY_CATEGORIES = Object.freeze([
  'operational',
  'economic_intelligence',
  'digital_twin',
  'what_if',
  'prediction',
  'governance',
  'observability'
]);

export const FINANCE_DOMAIN_CAPABILITY_INVENTORY = Object.freeze([
  Object.freeze({
    id: 'finance_workspace',
    label: 'Finance Workspace',
    category: 'operational',
    sourceProgram: 'FIN-EVOLVE-001A',
    owner: 'Finance Domain',
    contracts: Object.freeze(['finance.domain.workspace', 'finance.domain.navigation']),
    status: 'CERTIFIED'
  }),
  Object.freeze({
    id: 'industrial_costs',
    label: 'Industrial Costs',
    category: 'operational',
    sourceProgram: 'FIN-EVOLVE-001',
    owner: 'Platform / Dashboard',
    contracts: Object.freeze(['dashboard.costs']),
    status: 'CERTIFIED'
  }),
  Object.freeze({
    id: 'financial_leakage',
    label: 'Financial Leakage',
    category: 'operational',
    sourceProgram: 'FIN-EVOLVE-001',
    owner: 'Platform / Dashboard',
    contracts: Object.freeze(['dashboard.financialLeakage']),
    status: 'CERTIFIED'
  }),
  Object.freeze({
    id: 'wms_valuation',
    label: 'WMS Financial Valuation',
    category: 'operational',
    sourceProgram: 'FIN-READY-001',
    owner: 'Finance Valuation Adapter / WMS quantities',
    contracts: Object.freeze(['finance.wms_valuation.v1']),
    status: 'CERTIFIED'
  }),
  Object.freeze({
    id: 'economic_intelligence_engine',
    label: 'Economic Intelligence Engine',
    category: 'economic_intelligence',
    sourceProgram: 'FIN-EVOLVE-2.1',
    owner: 'Finance Domain',
    contracts: Object.freeze([
      'finance.driver_rate.v1',
      'finance.asset_cost_map.v1',
      'finance.wms_valuation.v1',
      'dashboard.costs',
      'dashboard.financialLeakage'
    ]),
    status: 'CERTIFIED'
  }),
  Object.freeze({
    id: 'smart_costing',
    label: 'Smart Costing',
    category: 'economic_intelligence',
    sourceProgram: 'FIN-EVOLVE-2.1',
    owner: 'Finance Domain',
    contracts: Object.freeze(['finance.driver_rate.v1', 'finance.asset_cost_map.v1']),
    status: 'CERTIFIED'
  }),
  Object.freeze({
    id: 'economic_performance',
    label: 'Economic Performance',
    category: 'economic_intelligence',
    sourceProgram: 'FIN-EVOLVE-2.1',
    owner: 'Finance Domain',
    contracts: Object.freeze(['dashboard.costs', 'dashboard.financialLeakage']),
    status: 'CERTIFIED'
  }),
  Object.freeze({
    id: 'financial_twin_perspective',
    label: 'Financial Digital Twin Perspective',
    category: 'digital_twin',
    sourceProgram: 'FIN-EVOLVE-2.2',
    owner: 'Finance overlay / Industrial Twin owner preserved',
    contracts: Object.freeze(['finance.asset_cost_map.v1', 'EconomicIntelligenceEngine']),
    status: 'CERTIFIED'
  }),
  Object.freeze({
    id: 'financial_what_if',
    label: 'Financial What-if Analysis',
    category: 'what_if',
    sourceProgram: 'FIN-EVOLVE-2.3',
    owner: 'Finance Domain',
    contracts: Object.freeze(['EconomicIntelligenceEngine', 'FinancialDigitalTwinComposition']),
    status: 'CERTIFIED'
  }),
  Object.freeze({
    id: 'predictive_financial_intelligence',
    label: 'Predictive Financial Intelligence',
    category: 'prediction',
    sourceProgram: 'FIN-EVOLVE-2.4',
    owner: 'Finance consumer / Enterprise Prediction Platform owner',
    contracts: Object.freeze(['platform.prediction.public_api.v1', 'platform.prediction.v0']),
    status: 'CERTIFIED'
  }),
  Object.freeze({
    id: 'finance_rbac',
    label: 'VIEW_FINANCIAL RBAC',
    category: 'governance',
    sourceProgram: 'FIN-EVOLVE-001',
    owner: 'Platform Security',
    contracts: Object.freeze(['VIEW_FINANCIAL']),
    status: 'CERTIFIED'
  }),
  Object.freeze({
    id: 'finance_contract_governance',
    label: 'Finance Contract Governance',
    category: 'governance',
    sourceProgram: 'FIN-READY-001',
    owner: 'Finance / Platform Governance',
    contracts: Object.freeze([
      'finance.driver_rate.v1',
      'finance.asset_cost_map.v1',
      'finance.wms_valuation.v1'
    ]),
    status: 'CERTIFIED'
  }),
  Object.freeze({
    id: 'finance_operational_validation',
    label: 'Finance Operational Validation',
    category: 'governance',
    sourceProgram: 'FIN-VAL-001',
    owner: 'Platform Validation',
    contracts: Object.freeze(['GATE-FIN-EVOLVE-2.3']),
    status: 'CERTIFIED'
  }),
  Object.freeze({
    id: 'finance_domain_events',
    label: 'Finance Domain Observability',
    category: 'observability',
    sourceProgram: 'FIN-EVOLVE-001',
    owner: 'Finance Domain',
    contracts: Object.freeze(['impetus:finance', 'finance.*']),
    status: 'CERTIFIED'
  }),
  Object.freeze({
    id: 'what_if_observability',
    label: 'What-if Observability',
    category: 'observability',
    sourceProgram: 'FIN-EVOLVE-2.3',
    owner: 'Finance Domain',
    contracts: Object.freeze(['finance.whatif.*']),
    status: 'CERTIFIED'
  }),
  Object.freeze({
    id: 'prediction_observability',
    label: 'Prediction Observability',
    category: 'observability',
    sourceProgram: 'FIN-EVOLVE-2.4',
    owner: 'Finance Domain',
    contracts: Object.freeze(['finance.prediction.*']),
    status: 'CERTIFIED'
  })
]);

export function getFinanceCapabilitiesByCategory(category) {
  return FINANCE_DOMAIN_CAPABILITY_INVENTORY.filter((capability) => capability.category === category);
}

export function validateFinanceDomainCapabilityInventory() {
  const issues = [];
  const ids = new Set();
  for (const capability of FINANCE_DOMAIN_CAPABILITY_INVENTORY) {
    if (ids.has(capability.id)) issues.push(`duplicate capability ${capability.id}`);
    ids.add(capability.id);
    if (!FINANCE_CAPABILITY_CATEGORIES.includes(capability.category)) {
      issues.push(`${capability.id}: invalid category`);
    }
    if (!FIN_CERT_001_COMPLETED_PROGRAMS.includes(capability.sourceProgram)) {
      issues.push(`${capability.id}: source program not in certified baseline`);
    }
    if (!capability.owner || !capability.contracts.length || capability.status !== 'CERTIFIED') {
      issues.push(`${capability.id}: incomplete certification metadata`);
    }
  }
  for (const category of FINANCE_CAPABILITY_CATEGORIES) {
    if (!getFinanceCapabilitiesByCategory(category).length) {
      issues.push(`empty category ${category}`);
    }
  }
  return {
    valid: issues.length === 0,
    issues,
    count: FINANCE_DOMAIN_CAPABILITY_INVENTORY.length,
    categories: FINANCE_CAPABILITY_CATEGORIES.length
  };
}

