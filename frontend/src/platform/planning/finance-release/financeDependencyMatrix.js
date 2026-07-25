/**
 * FIN-PLAN-001 — Dependency Matrix (read-only).
 * No duplication of platform engines — reuse only.
 */
import {
  FINANCE_CAPABILITY_PACKAGES,
  resolvePackageCapabilities
} from './financeCapabilityPackages.js';
import { FIN_CONCEPT_001_CAPABILITIES } from '../fin-concept-001/finConcept001AssessmentCatalog.js';

function buildCapabilityDependencyRow(cap) {
  return Object.freeze({
    capabilityId: cap.id,
    name: cap.name,
    reusedComponents: cap.reusedComponents || Object.freeze([]),
    dependencies: cap.dependencies || Object.freeze([]),
    contracts: Object.freeze(
      [
        cap.contract,
        ...(cap.apiContract ? [cap.apiContract] : []),
        'VIEW_FINANCIAL'
      ].filter(Boolean)
    ),
    integrations: Object.freeze([
      ...(cap.dependencies || []),
      ...(cap.reusedComponents || []).filter((x) => String(x).includes('/') || String(x).includes('Service'))
    ]),
    owningDomain: 'finance',
    strategy: cap.strategy,
    isNewModule: cap.isNewModule === true,
    duplicationForbidden: true
  });
}

export const FINANCE_DEPENDENCY_MATRIX = Object.freeze({
  phase: 'FIN-PLAN-001',
  principle: 'Nenhuma duplicação é permitida',
  byCapability: Object.freeze(
    FIN_CONCEPT_001_CAPABILITIES.map((c) => buildCapabilityDependencyRow(c))
  ),
  byRelease: Object.freeze(
    FINANCE_CAPABILITY_PACKAGES.map((pkg) => {
      const caps = resolvePackageCapabilities(pkg.id);
      return Object.freeze({
        releaseId: pkg.releaseId,
        packageId: pkg.id,
        capabilityIds: pkg.capabilityIds,
        reusedUnion: Object.freeze([
          ...new Set(caps.flatMap((c) => [...(c.reusedComponents || [])]))
        ]),
        dependencyUnion: Object.freeze([
          ...new Set(caps.flatMap((c) => [...(c.dependencies || [])]))
        ]),
        expectedReuse: pkg.expectedReuse,
        allowsNewModules: pkg.allowsNewModules,
        forbidden: pkg.forbidden || Object.freeze([])
      });
    })
  )
});

export function getCapabilityDependencies(capabilityId) {
  return FINANCE_DEPENDENCY_MATRIX.byCapability.find((r) => r.capabilityId === capabilityId) ?? null;
}

export function getReleaseDependencies(releaseId) {
  return FINANCE_DEPENDENCY_MATRIX.byRelease.find((r) => r.releaseId === String(releaseId)) ?? null;
}

export function validateFinanceDependencyMatrix() {
  const issues = [];
  if (FINANCE_DEPENDENCY_MATRIX.byCapability.length < 11) {
    issues.push('dependency matrix incomplete vs FIN-CONCEPT');
  }
  for (const row of FINANCE_DEPENDENCY_MATRIX.byCapability) {
    if (row.isNewModule && row.capabilityId !== 'capex_opex_investment' && row.capabilityId !== 'managerial_consolidation') {
      issues.push(`unexpected new module flag on ${row.capabilityId}`);
    }
    if (!row.duplicationForbidden) issues.push(`${row.capabilityId} must forbid duplication`);
  }
  const twin = getReleaseDependencies('2.2');
  if (twin && (!twin.forbidden || !twin.forbidden.length)) {
    issues.push('release 2.2 must declare forbidden parallel simulator');
  }
  return { valid: issues.length === 0, issues };
}
