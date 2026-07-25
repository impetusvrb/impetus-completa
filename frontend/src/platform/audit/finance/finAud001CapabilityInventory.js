/**
 * FIN-AUD-001 — Capability Inventory (metadata · read-only).
 */
import { FIN_AUD_DISCOVERY_CATALOG } from './finAud001DiscoveryIndex.js';

/** Inventário formal — cada capability com owner, dependências, reutilização */
export const FIN_CAPABILITY_INVENTORY = Object.freeze(
  FIN_AUD_DISCOVERY_CATALOG.map((entry) =>
    Object.freeze({
      capabilityId: entry.id,
      name: entry.name,
      domain: entry.domain,
      location: entry.location,
      responsibility: entry.responsibility,
      owner: _resolveOwner(entry.domain),
      dependencies: Object.freeze(entry.dependsOn || []),
      contracts: Object.freeze(_resolveContracts(entry)),
      integrations: Object.freeze(_resolveIntegrations(entry)),
      status: entry.status,
      maturity: entry.maturity,
      reuse: _resolveReuse(entry),
      crossDomain: entry.crossDomain === true
    })
  )
);

function _resolveOwner(domain) {
  const map = {
    platform_dashboard: 'Platform / Dashboard',
    contextual_modules: 'Contextual Modules Engine',
    nexus_ia: 'Nexus IA Platform',
    domain_authority: 'Domain Authority',
    eox: 'EOX / NAV',
    platform_governance: 'Platform Security',
    cognitive_runtime: 'cognitiveRuntime',
    supply: 'Supply (cross-ref)',
    production: 'Production (cross-ref)',
    logistics_wms: 'Logistics WMS (cross-ref)'
  };
  return map[domain] || domain;
}

function _resolveContracts(entry) {
  if (entry.id === 'supply_budget_reference') return ['SpendCenterContract', 'BudgetReference VO'];
  if (entry.domain === 'platform_dashboard' && entry.category === 'api') return ['dashboard.costs API client'];
  if (entry.id === 'view_financial_permission') return ['VIEW_FINANCIAL RBAC'];
  return [];
}

function _resolveIntegrations(entry) {
  if (entry.id === 'nexus_wallet_service') return ['Stripe', 'PagSeguro'];
  if (entry.id === 'billing_token_service') return ['Asaas'];
  if (entry.id === 'mes_erp_integration') return ['MES', 'ERP (production sync)'];
  return [];
}

function _resolveReuse(entry) {
  if (entry.maturity === 'complete' && entry.status === 'active') return 'required';
  if (entry.maturity === 'partial') return 'conditional';
  if (entry.maturity === 'placeholder') return 'planned';
  if (entry.crossDomain) return 'cross_reference';
  return 'evaluate';
}

export function getInventoryEntry(capabilityId) {
  return FIN_CAPABILITY_INVENTORY.find((e) => e.capabilityId === capabilityId) ?? null;
}

export function listInventoryByMaturity(maturity) {
  return FIN_CAPABILITY_INVENTORY.filter((e) => e.maturity === maturity);
}

export function listInventoryByDomain(domain) {
  return FIN_CAPABILITY_INVENTORY.filter((e) => e.domain === domain);
}

export function validateInventoryIntegrity() {
  const issues = [];
  if (FIN_CAPABILITY_INVENTORY.length !== FIN_AUD_DISCOVERY_CATALOG.length) {
    issues.push('inventory count mismatch vs discovery catalog');
  }
  for (const e of FIN_CAPABILITY_INVENTORY) {
    if (!e.owner) issues.push(`missing owner: ${e.capabilityId}`);
  }
  return { valid: issues.length === 0, issues, count: FIN_CAPABILITY_INVENTORY.length };
}
