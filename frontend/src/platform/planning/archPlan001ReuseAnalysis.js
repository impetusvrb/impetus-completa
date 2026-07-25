/**
 * ARCH-PLAN-001 — Análise de reaproveitamento (ENT-001 catalogs).
 */
import {
  getModuleCatalog,
  getRuntimeCatalog,
  getCognitiveCatalog,
  getIntegrationCatalog,
  getCrossDomainMatrix
} from '../knowledge/index.js';
import { ARCH_PLAN_001_PHASE } from './archPlan001Constants.js';

export function buildReuseAnalysis() {
  const matrix = getCrossDomainMatrix();
  const modules = getModuleCatalog();
  const runtimes = getRuntimeCatalog();
  const cognitive = getCognitiveCatalog();
  const integrations = getIntegrationCatalog();

  return Object.freeze(
    matrix.map((row) => {
      const domainModules = modules.filter((m) => m.domain === row.domainId);
      const domainRuntimes = runtimes.filter((r) => r.ownerDomain === row.domainId);
      const domainCognitive = cognitive.filter((c) => c.domain === row.domainId);
      const domainIntegrations = integrations.filter((i) => i.domain === row.domainId);

      const reusableComponents = Object.freeze(
        domainModules
          .filter((m) => m.maturity === 'complete' || m.maturity === 'certified')
          .map((m) => m.moduleId)
      );

      const existingRuntimes = Object.freeze(domainRuntimes.map((r) => r.runtimeId));
      const existingCognitive = Object.freeze(domainCognitive.map((c) => c.capabilityId));
      const existingIntegrations = Object.freeze(
        domainIntegrations.map((i) => i.integrationId || i.label).slice(0, 10)
      );

      const reuseEstimate = Math.min(
        100,
        reusableComponents.length * 12 +
          existingRuntimes.length * 10 +
          existingCognitive.length * 6 +
          Math.min(domainIntegrations.length, 5) * 4
      );

      return Object.freeze({
        domainId: row.domainId,
        label: row.label,
        maturity: row.maturity,
        reusableComponents,
        reusableComponentCount: reusableComponents.length,
        existingRuntimes,
        runtimeCount: existingRuntimes.length,
        existingCognitive,
        cognitiveCount: existingCognitive.length,
        existingIntegrations,
        integrationCount: domainIntegrations.length,
        reuseEstimatePercent: reuseEstimate,
        contracts: Object.freeze(
          domainIntegrations.filter((i) => i.type === 'api_contract').map((i) => i.integrationId)
        ),
        source: 'ENT-001 module/runtime/cognitive/integration catalogs'
      });
    })
  );
}

export const ARCH_REUSE_ANALYSIS = buildReuseAnalysis();

export function getReuseEntry(domainId) {
  return ARCH_REUSE_ANALYSIS.find((r) => r.domainId === domainId) ?? null;
}

export function listDomainsByReuse() {
  return [...ARCH_REUSE_ANALYSIS].sort((a, b) => b.reuseEstimatePercent - a.reuseEstimatePercent);
}

export function validateReuseAnalysis() {
  const issues = [];
  const finance = getReuseEntry('finance');
  if (!finance || finance.reuseEstimatePercent < 20) {
    issues.push('finance should show significant reuse potential');
  }
  const wms = getReuseEntry('logistics_wms');
  if (!wms || wms.reusableComponentCount < 5) {
    issues.push('logistics_wms should show high reuse');
  }
  return {
    valid: issues.length === 0,
    issues,
    phase: ARCH_PLAN_001_PHASE,
    count: ARCH_REUSE_ANALYSIS.length
  };
}
