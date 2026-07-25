/**
 * FIN-CERT-001 — Residual items are evolutionary coverage/business backlog.
 * They do not reopen the certified domain baseline.
 */
import { ECONOMIC_ENGINE_TECHNICAL_BACKLOG } from '../../../domains/finance/contracts/economicEngineContracts.js';

export const FINANCE_RESIDUAL_BACKLOG = Object.freeze([
  Object.freeze({
    id: 'GAP-PB-003',
    category: 'coverage_expansion',
    title: 'Certified energy history and energy prediction coverage',
    origin: 'PRED-BASE-002 / FIN-EVOLVE-2.4',
    disposition: 'EVOLUTIONARY_BACKLOG',
    certificationBlocks: false
  }),
  ...ECONOMIC_ENGINE_TECHNICAL_BACKLOG.map((item) =>
    Object.freeze({
      id: item.id,
      category: 'technical_extension',
      title: item.title,
      origin: 'FIN-DATA-001 / FIN-EVOLVE-2.1',
      disposition: 'EVOLUTIONARY_BACKLOG',
      extensionSlot: item.extensionSlot,
      certificationBlocks: false
    })
  ),
  Object.freeze({
    id: 'FIN-BIZ-PLANNING',
    category: 'future_business_evolution',
    title: 'Financial planning and budgeting',
    origin: 'business demand required',
    disposition: 'BUSINESS_JUSTIFIED_ONLY',
    certificationBlocks: false
  }),
  Object.freeze({
    id: 'FIN-BIZ-CONSOLIDATION',
    category: 'future_business_evolution',
    title: 'Managerial consolidation',
    origin: 'business demand required',
    disposition: 'BUSINESS_JUSTIFIED_ONLY',
    certificationBlocks: false
  }),
  Object.freeze({
    id: 'FIN-BIZ-ERP',
    category: 'future_business_evolution',
    title: 'ERP integration expansion',
    origin: 'business demand required',
    disposition: 'BUSINESS_JUSTIFIED_ONLY',
    certificationBlocks: false
  }),
  Object.freeze({
    id: 'FIN-PRED-TARGETS',
    category: 'coverage_expansion',
    title: 'Additional certified prediction targets',
    origin: 'future platform coverage',
    disposition: 'EVOLUTIONARY_BACKLOG',
    certificationBlocks: false
  })
]);

export function validateFinanceResidualBacklog() {
  const issues = [];
  const ids = new Set();
  for (const item of FINANCE_RESIDUAL_BACKLOG) {
    if (ids.has(item.id)) issues.push(`duplicate backlog ${item.id}`);
    ids.add(item.id);
    if (!item.category || !item.origin || !item.disposition) {
      issues.push(`${item.id}: incomplete classification`);
    }
    if (item.certificationBlocks !== false) {
      issues.push(`${item.id}: residual backlog must not block certification`);
    }
  }
  if (!ids.has('GAP-PB-003')) issues.push('energy coverage backlog missing');
  return {
    valid: issues.length === 0,
    issues,
    count: FINANCE_RESIDUAL_BACKLOG.length,
    blocksCertification: false
  };
}

