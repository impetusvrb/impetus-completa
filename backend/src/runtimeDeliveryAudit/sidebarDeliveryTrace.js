'use strict';

const { DeliveryTraceCollector, normModules } = require('./deliveryTraceCollector');
const { findReinjectionPoints } = require('./legacyInjectionTrace');

function traceSidebarDelivery(input = {}, ctx = {}) {
  const collector = new DeliveryTraceCollector('sidebar');
  const legacy = normModules(input.legacy_visible_modules || input.visible_modules);
  const contextual = (input.contextual_modules || []).map((m) => m.module_id || m.menu_key).filter(Boolean);

  collector.recordModuleTransition('legacy_baseline', 'dashboardAccessService', [], legacy, {
    legacy_source: true
  });
  collector.recordModuleTransition('contextual_modules_raw', 'contextualModules', legacy, [...legacy, ...contextual], {
    contextual_source: true
  });

  const afterZ2 = normModules(input.after_contextual_activation || legacy);
  collector.recordModuleTransition('contextual_enforcement_Z2', 'contextualActivation', legacy, afterZ2, {
    governance_applied: !!input.contextual_enforcement_activation?.enforcement_applied
  });

  const afterZ3 = normModules(input.after_pilot || afterZ2);
  collector.recordModuleTransition('pilot_runtime_Z3', 'pilotTenants', afterZ2, afterZ3, {
    governance_applied: !!input.pilot_runtime?.menu_pipeline?.pilot_applied
  });

  const afterZ13 = normModules(input.after_z13 || afterZ3);
  collector.recordModuleTransition('real_enforcement_Z13', 'realTenantEnforcement', afterZ3, afterZ13, {
    governance_applied: input.real_tenant_enforcement?.real_enforcement_active === true
  });

  const afterZ14 = normModules(
    input.sidebar_governance_runtime?.final_visible_modules || input.after_z14 || afterZ13
  );
  collector.recordModuleTransition('canonical_governance_Z14', 'canonicalModuleGovernance', afterZ13, afterZ14, {
    governance_applied: input.sidebar_governance_runtime?.governance_applied === true,
    denied_modules: (input.sidebar_governance_runtime?.removed_modules || []).map((r) => r.module || r)
  });

  const denied = input.sidebar_governance_runtime?.denied_publications || [];
  const leakage = findReinjectionPoints(collector.getTimeline(), denied);
  const finalMods = afterZ14;
  const denySet = new Set((input.sidebar_governance_runtime?.removed_modules || []).map((r) => String(r.module || r).toLowerCase()));
  const leakageInFinal = finalMods.filter((m) => denySet.has(String(m).toLowerCase()));

  return {
    stages: collector.getTimeline(),
    overwrites: collector.detectOverwrites(),
    reinjection_points: leakage,
    final_visible_modules: finalMods,
    leakage_detected: leakage.length > 0 || leakageInFinal.length > 0,
    leakage_modules: leakageInFinal,
    governance_applied: input.sidebar_governance_runtime?.governance_applied === true,
    contextual_modules_governed: normModules(input.contextual_modules_governed || [])
  };
}

module.exports = { traceSidebarDelivery };
