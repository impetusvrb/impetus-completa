/**
 * ARCH-PLAN-001 — Mapa de dependências por domínio (evidência ENT-001).
 */
import { getCrossDomainMatrix } from '../knowledge/index.js';
import { ARCH_PLAN_001_PHASE } from './archPlan001Constants.js';

/** Dependências declaradas com base na baseline — sem nova auditoria */
const DOMAIN_DEPENDENCIES = Object.freeze({
  logistics_wms: Object.freeze({
    technical: Object.freeze([]),
    functional: Object.freeze([]),
    cognitive: Object.freeze(['recommendation_engine', 'unified_timeline']),
    operational: Object.freeze(['OPM-GOV-001', 'WMS-REF-001'])
  }),
  quality: Object.freeze({
    technical: Object.freeze(['command_center']),
    functional: Object.freeze(['logistics_wms']),
    cognitive: Object.freeze(['quality_adapter', 'recommendation_engine']),
    operational: Object.freeze(['GF-027'])
  }),
  safety: Object.freeze({
    technical: Object.freeze(['command_center']),
    functional: Object.freeze(['quality']),
    cognitive: Object.freeze(['safety_adapter']),
    operational: Object.freeze(['GF-027'])
  }),
  environment: Object.freeze({
    technical: Object.freeze(['command_center']),
    functional: Object.freeze(['production']),
    cognitive: Object.freeze(['environment_adapter']),
    operational: Object.freeze(['GF-027'])
  }),
  finance: Object.freeze({
    technical: Object.freeze(['command_center', 'nexus_ia', 'contextual_modules']),
    functional: Object.freeze(['logistics_wms', 'production']),
    cognitive: Object.freeze(['smart_panel', 'finance_adapter']),
    operational: Object.freeze(['industrial_cost_service', 'financial_leakage_detector'])
  }),
  supply: Object.freeze({
    technical: Object.freeze(['logistics_wms', 'EOX']),
    functional: Object.freeze(['logistics_wms', 'purchasing']),
    cognitive: Object.freeze(['logistics_adapter', 'OPM-008']),
    operational: Object.freeze(['OPM-008 handoff'])
  }),
  production: Object.freeze({
    technical: Object.freeze(['operational', 'MES/ERP refs']),
    functional: Object.freeze(['logistics_wms', 'quality']),
    cognitive: Object.freeze(['cognitive_economics']),
    operational: Object.freeze(['industrial_operational_map'])
  }),
  ppap: Object.freeze({
    technical: Object.freeze(['quality', 'command_center']),
    functional: Object.freeze(['quality']),
    cognitive: Object.freeze(['cockpit_runtime', 'specialized_cockpit_resolver']),
    operational: Object.freeze(['EOX PLANNED'])
  }),
  msa: Object.freeze({
    technical: Object.freeze(['quality', 'command_center']),
    functional: Object.freeze(['quality']),
    cognitive: Object.freeze(['cockpit_runtime']),
    operational: Object.freeze(['EOX PLANNED'])
  }),
  ishikawa: Object.freeze({
    technical: Object.freeze(['quality', 'command_center']),
    functional: Object.freeze(['quality']),
    cognitive: Object.freeze(['cockpit_runtime']),
    operational: Object.freeze(['EOX PLANNED'])
  }),
  purchasing: Object.freeze({
    technical: Object.freeze(['supply']),
    functional: Object.freeze(['supply', 'finance']),
    cognitive: Object.freeze([]),
    operational: Object.freeze(['BudgetReference cross-ref'])
  }),
  command_center: Object.freeze({
    technical: Object.freeze(['cognitive_center']),
    functional: Object.freeze(['logistics_wms', 'quality', 'safety', 'environment']),
    cognitive: Object.freeze(['smart_panel', 'command_center_adapter']),
    operational: Object.freeze(['dashboard_profiles'])
  }),
  cognitive_center: Object.freeze({
    technical: Object.freeze(['CPL governance']),
    functional: Object.freeze(['command_center']),
    cognitive: Object.freeze(['cognitive_runtime_orchestrator']),
    operational: Object.freeze([])
  }),
  nexus_ia: Object.freeze({
    technical: Object.freeze(['billing infrastructure']),
    functional: Object.freeze(['finance']),
    cognitive: Object.freeze(['cognitive_budget_runtime']),
    operational: Object.freeze(['nexus_billing_engine_v4'])
  }),
  executive: Object.freeze({
    technical: Object.freeze(['command_center']),
    functional: Object.freeze(['finance', 'logistics_wms']),
    cognitive: Object.freeze(['executive_aioi', 'cognitive_economics']),
    operational: Object.freeze([])
  }),
  operational: Object.freeze({
    technical: Object.freeze(['command_center']),
    functional: Object.freeze(['logistics_wms']),
    cognitive: Object.freeze(['operational_brain_engine']),
    operational: Object.freeze(['REG-002 recovered chains'])
  }),
  maintenance: Object.freeze({
    technical: Object.freeze(['operational']),
    functional: Object.freeze(['production']),
    cognitive: Object.freeze([]),
    operational: Object.freeze([])
  }),
  hr: Object.freeze({
    technical: Object.freeze([]),
    functional: Object.freeze([]),
    cognitive: Object.freeze([]),
    operational: Object.freeze([])
  }),
  audit: Object.freeze({
    technical: Object.freeze(['platform_governance']),
    functional: Object.freeze(['finance', 'compliance']),
    cognitive: Object.freeze([]),
    operational: Object.freeze(['FIN-AUD', 'REG'])
  }),
  compliance: Object.freeze({
    technical: Object.freeze(['quality', 'safety', 'environment']),
    functional: Object.freeze(['audit']),
    cognitive: Object.freeze([]),
    operational: Object.freeze(['GF-027 compliance views'])
  })
});

export function buildDependencyMap() {
  const matrix = getCrossDomainMatrix();
  return Object.freeze(
    matrix.map((row) => {
      const deps = DOMAIN_DEPENDENCIES[row.domainId] || Object.freeze({
        technical: Object.freeze([]),
        functional: Object.freeze([]),
        cognitive: Object.freeze([]),
        operational: Object.freeze([])
      });

      const allDeps = [
        ...deps.technical,
        ...deps.functional,
        ...deps.cognitive,
        ...deps.operational
      ];

      return Object.freeze({
        domainId: row.domainId,
        label: row.label,
        maturity: row.maturity,
        dependencies: deps,
        dependencyCount: allDeps.length,
        blocksDomains: _findBlockedBy(row.domainId),
        blockedBy: _findBlockers(row.domainId, deps)
      });
    })
  );
}

function _findBlockers(domainId, deps) {
  const blockers = new Set();
  for (const t of deps.technical) {
    if (DOMAIN_DEPENDENCIES[t]) blockers.add(t);
  }
  for (const f of deps.functional) {
    if (DOMAIN_DEPENDENCIES[f]) blockers.add(f);
  }
  return Object.freeze([...blockers]);
}

function _findBlockedBy(domainId) {
  const blocked = [];
  for (const [id, deps] of Object.entries(DOMAIN_DEPENDENCIES)) {
    const all = [...deps.technical, ...deps.functional];
    if (all.includes(domainId)) blocked.push(id);
  }
  return Object.freeze(blocked);
}

export const ARCH_DEPENDENCY_MAP = buildDependencyMap();

export function getDependencyEntry(domainId) {
  return ARCH_DEPENDENCY_MAP.find((d) => d.domainId === domainId) ?? null;
}

export function validateDependencyMap() {
  const issues = [];
  const finance = getDependencyEntry('finance');
  if (!finance || finance.blockedBy.length < 1) {
    issues.push('finance should declare blockers');
  }
  if (ARCH_DEPENDENCY_MAP.length < 15) issues.push('incomplete dependency map');
  return {
    valid: issues.length === 0,
    issues,
    phase: ARCH_PLAN_001_PHASE,
    count: ARCH_DEPENDENCY_MAP.length
  };
}
