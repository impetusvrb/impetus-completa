/**
 * ENT-001 — Matriz cross-domain (Domínio × Módulos × Runtime × Cognitive × APIs × Status).
 */
import { ENT_DOMAIN_CATALOG } from './ent001DomainCatalog.js';
import { ENT_MODULE_CATALOG } from './ent001ModuleCatalog.js';
import { ENT_RUNTIME_CATALOG } from './ent001RuntimeCatalog.js';
import { ENT_COGNITIVE_CATALOG } from './ent001CognitiveCatalog.js';
import { ENT_INTEGRATION_CATALOG } from './ent001IntegrationCatalog.js';
import { ENT_001_PHASE } from './ent001Constants.js';

export function buildCrossDomainMatrix() {
  return Object.freeze(
    ENT_DOMAIN_CATALOG.map((domain) => {
      const modules = ENT_MODULE_CATALOG.filter((m) => m.domain === domain.domainId);
      const runtimes = ENT_RUNTIME_CATALOG.filter((r) => r.ownerDomain === domain.domainId);
      const cognitive = ENT_COGNITIVE_CATALOG.filter((c) => c.domain === domain.domainId);
      const integrations = ENT_INTEGRATION_CATALOG.filter(
        (i) => i.domain === domain.domainId || i.domain === 'cross_domain'
      );

      let status = domain.maturity;
      if (domain.active && modules.length >= 5) status = domain.maturity;
      if (!domain.active && modules.length === 0) status = 'not_started';

      return Object.freeze({
        domainId: domain.domainId,
        label: domain.label,
        active: domain.active,
        moduleCount: modules.length,
        runtimeCount: runtimes.length,
        cognitiveCount: cognitive.length,
        integrationCount: integrations.length,
        maturity: domain.maturity,
        status,
        certification: domain.certification,
        modules: Object.freeze(modules.slice(0, 8).map((m) => m.moduleId)),
        runtimes: Object.freeze(runtimes.slice(0, 5).map((r) => r.runtimeId)),
        cognitiveCapabilities: Object.freeze(cognitive.slice(0, 5).map((c) => c.capabilityId))
      });
    })
  );
}

export const ENT_CROSS_DOMAIN_MATRIX = buildCrossDomainMatrix();

export function getMatrixRow(domainId) {
  return ENT_CROSS_DOMAIN_MATRIX.find((r) => r.domainId === domainId) ?? null;
}

export function validateCrossDomainMatrix() {
  const issues = [];
  if (ENT_CROSS_DOMAIN_MATRIX.length !== ENT_DOMAIN_CATALOG.length) {
    issues.push('matrix row count mismatch vs domain catalog');
  }
  const logistics = getMatrixRow('logistics_wms');
  if (!logistics || logistics.moduleCount < 5) {
    issues.push('logistics_wms should have >= 5 modules in matrix');
  }
  return {
    valid: issues.length === 0,
    issues,
    phase: ENT_001_PHASE,
    rowCount: ENT_CROSS_DOMAIN_MATRIX.length
  };
}
