/**
 * FIN-EVOLVE-001A — ONE DOMAIN · ONE IDENTITY
 * Ponto único de identidade e registry do domínio Finance.
 */
import { COGNITIVE_CENTER_RETURN } from '../../../presentation/eox/eoxTokens.js';
import {
  FIN_EVOLVE_001_PHASE,
  FIN_EVOLVE_001_STRATEGY,
  FINANCE_CAPABILITY_REGISTRY
} from '../registry/financeCapabilityRegistry.js';

export const FIN_EVOLVE_001A_PHASE = 'FIN-EVOLVE-001A';
export const FIN_STAB_001_PHASE = 'FIN-STAB-001';
export const FINANCE_DOMAIN_ID = 'finance';

/** Identidade oficial — única fonte para nome, ícone, descrição e landing. */
export const FINANCE_DOMAIN_IDENTITY = Object.freeze({
  id: FINANCE_DOMAIN_ID,
  displayName: 'Finance',
  shortName: 'Finance',
  icon: 'DollarSign',
  color: 'var(--cyan)',
  description:
    'Inteligência financeira operacional — custos industriais, vazamentos, billing, wallet e ledger integrados.',
  landingRoute: '/app/finance',
  workspaceName: 'Finance Hub',
  strategy: FIN_EVOLVE_001_STRATEGY,
  owner: 'finance_domain',
  phase: FIN_STAB_001_PHASE,
  eoxVersion: 'FIN-STAB-001 v1',
  integrationPhase: FIN_EVOLVE_001_PHASE,
  experiencePhase: FIN_EVOLVE_001A_PHASE
});

function domainBack(label, landingPath) {
  return Object.freeze({
    path: landingPath,
    label: `Voltar para ${label}`,
    shortLabel: label
  });
}

/** Entrada EOX — consumida por eoxRegistry.js */
export const FINANCE_EOX_DOMAIN_ENTRY = Object.freeze({
  id: FINANCE_DOMAIN_IDENTITY.id,
  label: FINANCE_DOMAIN_IDENTITY.displayName,
  active: true,
  basePath: FINANCE_DOMAIN_IDENTITY.landingRoute,
  domainLandingPath: FINANCE_DOMAIN_IDENTITY.landingRoute,
  backTarget: domainBack(FINANCE_DOMAIN_IDENTITY.displayName, FINANCE_DOMAIN_IDENTITY.landingRoute),
  ccBackTarget: COGNITIVE_CENTER_RETURN,
  version: FINANCE_DOMAIN_IDENTITY.eoxVersion,
  defaultPhase: FIN_EVOLVE_001_PHASE,
  experiencePhase: FIN_EVOLVE_001A_PHASE,
  hubSubtitle: FINANCE_DOMAIN_IDENTITY.description
});

/** Registry completo do domínio — consumido por Navigation, EOX, Workspace, Resolver. */
export const FINANCE_DOMAIN_METADATA_REGISTRY = Object.freeze({
  identity: FINANCE_DOMAIN_IDENTITY,
  eox: FINANCE_EOX_DOMAIN_ENTRY,
  strategy: FIN_EVOLVE_001_STRATEGY,
  owner: FINANCE_DOMAIN_IDENTITY.owner,
  phases: Object.freeze([FIN_EVOLVE_001_PHASE, FIN_EVOLVE_001A_PHASE, FIN_STAB_001_PHASE]),
  capabilities: FINANCE_CAPABILITY_REGISTRY,
  contextualModuleKeys: Object.freeze(['financial_intelligence', 'cost_center', 'losses_map']),
  principle: 'ONE DOMAIN · ONE IDENTITY'
});

export function getFinanceDomainIdentity() {
  return FINANCE_DOMAIN_IDENTITY;
}

export function validateFinanceDomainMetadata() {
  const issues = [];
  if (FINANCE_DOMAIN_IDENTITY.displayName !== 'Finance') {
    issues.push('official displayName must be Finance');
  }
  if (FINANCE_DOMAIN_IDENTITY.displayName !== FINANCE_DOMAIN_IDENTITY.shortName) {
    issues.push('displayName and shortName must match for unified identity');
  }
  if (!FINANCE_DOMAIN_IDENTITY.landingRoute.startsWith('/app/finance')) {
    issues.push('landingRoute must be under /app/finance');
  }
  if (FINANCE_EOX_DOMAIN_ENTRY.label !== FINANCE_DOMAIN_IDENTITY.displayName) {
    issues.push('EOX label must match domain displayName');
  }
  return { valid: issues.length === 0, issues };
}
