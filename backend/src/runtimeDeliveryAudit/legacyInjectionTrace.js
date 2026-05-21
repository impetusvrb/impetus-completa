'use strict';

/**
 * Catálogo estático de injectors conhecidos (sidebar / módulos).
 */
const LEGACY_INJECTOR_CATALOG = Object.freeze([
  {
    injector_name: 'contextual_modules_enrich',
    source_file: 'backend/src/contextualModules/index.js',
    layer: 'backend',
    execution_order: 10,
    can_reinject_denied_modules: true,
    respects_governance: false,
    active: true
  },
  {
    injector_name: 'safeMergeSafetyPublicationIntoMenu',
    source_file: 'frontend/src/domains/safety/navigation/safetyMenuPublicationEngine.js',
    layer: 'frontend',
    execution_order: 80,
    can_reinject_denied_modules: true,
    respects_governance: false,
    active: true
  },
  {
    injector_name: 'safeMergeEnvironmentPublicationIntoMenu',
    source_file: 'frontend/src/domains/environment/navigation/environmentMenuPublicationEngine.js',
    layer: 'frontend',
    execution_order: 83,
    can_reinject_denied_modules: true,
    respects_governance: false,
    active: true
  },
  {
    injector_name: 'safeMergeQualityPublicationIntoMenu',
    source_file: 'frontend/src/domains/quality/navigation/qualityMenuPublicationEngine.js',
    layer: 'frontend',
    execution_order: 78,
    can_reinject_denied_modules: false,
    respects_governance: true,
    active: true
  },
  {
    injector_name: 'safeMergeLogisticsPublicationIntoMenu',
    source_file: 'frontend/src/domains/logistics/navigation/logisticsMenuPublicationEngine.js',
    layer: 'frontend',
    execution_order: 82,
    can_reinject_denied_modules: true,
    respects_governance: false,
    active: true
  },
  {
    injector_name: 'buildHybridMenu',
    source_file: 'frontend/src/utils/contextualSidebarBuilder.core.cjs',
    layer: 'frontend',
    execution_order: 75,
    can_reinject_denied_modules: true,
    respects_governance: false,
    active: true
  },
  {
    injector_name: 'sidebarGovernanceAdapter',
    source_file: 'frontend/src/runtimeGovernance/sidebarGovernanceAdapter.js',
    layer: 'frontend',
    execution_order: 90,
    can_reinject_denied_modules: false,
    respects_governance: true,
    active: true
  },
  {
    injector_name: 'canonicalModuleGovernance_Z14',
    source_file: 'backend/src/canonicalModuleGovernance/moduleGovernanceFacade.js',
    layer: 'backend',
    execution_order: 70,
    can_reinject_denied_modules: false,
    respects_governance: true,
    active: true
  },
  {
    injector_name: 'realTenantEnforcement_Z13',
    source_file: 'backend/src/realTenantEnforcement/realTenantEnforcementFacade.js',
    layer: 'backend',
    execution_order: 65,
    can_reinject_denied_modules: false,
    respects_governance: true,
    active: true
  },
  {
    injector_name: 'pilotMenuRuntimePipeline_Z3',
    source_file: 'backend/src/pilotTenants/pilotMenuRuntimePipeline.js',
    layer: 'backend',
    execution_order: 55,
    can_reinject_denied_modules: false,
    respects_governance: true,
    active: true
  },
  {
    injector_name: 'contextualActivation_Z2',
    source_file: 'backend/src/contextualActivation/contextualActivationFacade.js',
    layer: 'backend',
    execution_order: 50,
    can_reinject_denied_modules: false,
    respects_governance: true,
    active: true
  },
  {
    injector_name: 'dashboardAccessService_legacy',
    source_file: 'backend/src/services/dashboardAccessService.js',
    layer: 'backend',
    execution_order: 5,
    can_reinject_denied_modules: true,
    respects_governance: false,
    active: true
  },
  {
    injector_name: 'precisionDelivery_enrich',
    source_file: 'backend/src/precisionRuntime/precisionRuntimeFacade.js',
    layer: 'backend',
    execution_order: 20,
    can_reinject_denied_modules: true,
    respects_governance: false,
    active: true
  },
  {
    injector_name: 'contextualDeliveryStabilization',
    source_file: 'backend/src/contextualDeliveryStabilization/contextualDeliveryStabilizationFacade.js',
    layer: 'backend',
    execution_order: 25,
    can_reinject_denied_modules: true,
    respects_governance: false,
    active: true
  }
]);

function auditLegacyInjectors(ctx = {}) {
  const highRisk = LEGACY_INJECTOR_CATALOG.filter((i) => i.can_reinject_denied_modules);
  const governanceSafe = LEGACY_INJECTOR_CATALOG.filter((i) => i.respects_governance);
  return {
    legacy_injectors: LEGACY_INJECTOR_CATALOG.map((i) => ({
      ...i,
      modules_added: ctx[i.injector_name]?.modules_added || [],
      modules_removed: ctx[i.injector_name]?.modules_removed || [],
      modules_overridden: ctx[i.injector_name]?.modules_overridden || []
    })),
    reinjection_capable: highRisk,
    governance_respecting: governanceSafe,
    highest_risk: highRisk.map((i) => i.injector_name)
  };
}

function findReinjectionPoints(stages = [], denied = []) {
  const denySet = new Set((denied || []).map((d) => String(d).toLowerCase()));
  const points = [];
  for (const s of stages) {
    for (const mod of s.added_modules || []) {
      if (denySet.has(String(mod).toLowerCase())) {
        points.push({ stage: s.stage, source: s.source, module: mod, type: 'denied_module_reappeared' });
      }
    }
  }
  return points;
}

module.exports = { LEGACY_INJECTOR_CATALOG, auditLegacyInjectors, findReinjectionPoints };
