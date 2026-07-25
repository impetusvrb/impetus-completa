/**
 * FIN-EVOLVE-001 — Contratos públicos do domínio Finance (reutiliza existentes).
 */
import { FIN_CONTRACTS_INDEX } from '../../../platform/audit/finance/finAud001ContractsIndex.js';

export const FINANCE_PUBLIC_CONTRACTS = Object.freeze([
  Object.freeze({
    contractId: 'finance.domain.workspace',
    type: 'domain_surface',
    version: '1.0.0',
    phase: 'FIN-EVOLVE-001',
    description: 'Workspace unificado /app/finance — composição EOX',
    reuses: Object.freeze(['EOX finance entry', 'finance_integration_layer_v1'])
  }),
  Object.freeze({
    contractId: 'finance.domain.navigation',
    type: 'navigation',
    version: '1.0.0',
    phase: 'FIN-EVOLVE-001',
    description: 'Navegação Finance — VIEW_FINANCIAL + financeAccess policy',
    reuses: Object.freeze(['VIEW_FINANCIAL', 'finance_management profile'])
  }),
  ...FIN_CONTRACTS_INDEX.filter((c) =>
    ['dashboard.costs', 'dashboard.financialLeakage', 'nexusWallet.admin', 'VIEW_FINANCIAL'].includes(
      c.contractId
    )
  ).map((c) =>
    Object.freeze({
      contractId: `finance.reexport.${c.contractId}`,
      type: 'reexport',
      sourceContract: c.contractId,
      provider: c.provider,
      consumer: c.consumer,
      status: c.status,
      phase: 'FIN-EVOLVE-001',
      note: 'Reexport declarativo — sem alterar contrato canónico'
    })
  )
]);

export function getFinancePublicContract(contractId) {
  return FINANCE_PUBLIC_CONTRACTS.find((c) => c.contractId === contractId) ?? null;
}

export function validateFinancePublicContracts() {
  const issues = [];
  const required = ['finance.domain.workspace', 'finance.domain.navigation'];
  for (const id of required) {
    if (!getFinancePublicContract(id)) issues.push(`missing ${id}`);
  }
  return { valid: issues.length === 0, issues, count: FINANCE_PUBLIC_CONTRACTS.length };
}
