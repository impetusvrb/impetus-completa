/**
 * ENT-001 — Catálogo de integrações (APIs, contratos, flags, REG recovery).
 */
import { FIN_CONTRACTS_INDEX, listBrokenContracts } from '../audit/finance/finAud001ContractsIndex.js';
import { FIN_RULES_INDEX } from '../audit/finance/finAud001RulesIndex.js';
import {
  REG_ORPHAN_API_CLIENTS,
  REG_FUNCTIONAL_RECOVERY_MATRIX
} from '../audit/regression/reg001RecoveryMatrix.js';
import {
  REG_002_CRITICAL_NAV_ITEMS,
  REG_002_RESOLVED_DEAD_CLICKS
} from '../audit/regression/reg002DeadClickMatrix.js';
import { ENT_001_PHASE } from './ent001Constants.js';

/** Estado pós REG-002 para integrações críticas remontadas */
const REG002_RECOVERY_STATUS = Object.freeze({
  mapa_vazamentos: Object.freeze({ recovered: true, recoveryId: 'R1', note: 'Rotas /financial-leakage montadas' }),
  mapa_industrial: Object.freeze({ recovered: true, recoveryId: 'R2', note: 'Rotas /industrial montadas' }),
  operational_insights: Object.freeze({ recovered: true, recoveryId: 'R4', note: 'Guards unificados' }),
  cerebro_operacional: Object.freeze({ recovered: true, recoveryId: 'R5', note: 'Deep-links + guards' })
});

function _mapContract(c) {
  const broken = listBrokenContracts().some((b) => b.contractId === c.contractId);
  let postReg002 = null;
  if (c.contractId === 'dashboard.financialLeakage') {
    postReg002 = REG002_RECOVERY_STATUS.mapa_vazamentos;
  } else if (c.contractId === 'dashboard.industrial') {
    postReg002 = REG002_RECOVERY_STATUS.mapa_industrial;
  }
  return Object.freeze({
    integrationId: c.contractId,
    label: c.contractId,
    type: 'api_contract',
    domain: 'finance',
    client: c.consumer,
    backend: c.provider,
    contractStatus: c.status,
    status: broken && !postReg002?.recovered ? 'broken_at_audit' : c.status || 'active',
    postReg002,
    source: 'FIN-AUD-001 contracts'
  });
}

function _mapOrphan(o) {
  const recovered = REG_002_CRITICAL_NAV_ITEMS.some(
    (n) => n.apiClient && o.client?.includes(n.apiClient.split('.')[1])
  );
  return Object.freeze({
    integrationId: `orphan:${o.client}`,
    label: o.client,
    type: 'orphan_api_client',
    domain: 'platform_dashboard',
    expected: o.expected,
    status: recovered ? 'recovered_reg002' : o.status,
    relatedFeature: o.relatedFeature,
    source: 'REG-001 orphan clients'
  });
}

function _mapRecoveryChain(item) {
  return Object.freeze({
    integrationId: `chain:${item.id}`,
    label: item.label,
    type: 'ui_api_chain',
    domain: 'platform_dashboard',
    ui: item.ui,
    route: item.routePath,
    apiClient: item.apiClientPath,
    backendMount: item.backendMount,
    service: item.servicePath,
    status: item.status,
    breakPoint: item.breakPoint,
    postReg002: REG002_RECOVERY_STATUS[item.id] || null,
    source: 'REG-001 recovery matrix'
  });
}

export function buildIntegrationCatalog() {
  return Object.freeze([
    ...FIN_CONTRACTS_INDEX.map(_mapContract),
    ...REG_ORPHAN_API_CLIENTS.map(_mapOrphan),
    ...REG_FUNCTIONAL_RECOVERY_MATRIX.map(_mapRecoveryChain),
    ...FIN_RULES_INDEX.map((r) =>
      Object.freeze({
        integrationId: `rule:${r.ruleId}`,
        label: r.label || r.ruleId,
        type: 'governance_rule',
        domain: r.domain || 'platform_governance',
        location: r.location,
        ruleType: r.type,
        source: 'FIN-AUD-001 rules index'
      })
    )
  ]);
}

export const ENT_INTEGRATION_CATALOG = buildIntegrationCatalog();

export function listIntegrationsByStatus(status) {
  return ENT_INTEGRATION_CATALOG.filter((i) => i.status === status);
}

export function listReg002Resolved() {
  return [...REG_002_RESOLVED_DEAD_CLICKS];
}

export function validateIntegrationCatalog() {
  const issues = [];
  if (ENT_INTEGRATION_CATALOG.length < 10) {
    issues.push(`expected >= 10 integrations, got ${ENT_INTEGRATION_CATALOG.length}`);
  }
  const chains = ENT_INTEGRATION_CATALOG.filter((i) => i.type === 'ui_api_chain');
  if (chains.length < 5) issues.push('incomplete recovery chains');
  return {
    valid: issues.length === 0,
    issues,
    phase: ENT_001_PHASE,
    count: ENT_INTEGRATION_CATALOG.length,
    reg002Resolved: REG_002_RESOLVED_DEAD_CLICKS.length
  };
}
