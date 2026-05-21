'use strict';

const flags = require('../phaseZ0/config/phaseZ0FeatureFlags');
const { logPhaseZ0 } = require('../phaseZ0/phaseZ0Logger');

function observeHierarchyMismatch(ctx = {}) {
  const mismatches = [];
  const level = ctx.canonical_identity?.hierarchy_level ?? ctx.hierarchy_level;
  const modules = ctx.visible_modules || [];

  const executiveModules = ['audit', 'admin'];
  const operationalOnly = ['manuia', 'anomaly_detection', 'raw_material_lots'];

  if (level >= 4 && executiveModules.some((m) => modules.includes(m))) {
    mismatches.push({ type: 'executive_module_on_base_level', level, modules: executiveModules.filter((m) => modules.includes(m)) });
  }
  if (level <= 2 && operationalOnly.some((m) => modules.includes(m)) && ctx.profile_code?.includes('ceo')) {
    mismatches.push({ type: 'operational_cockpit_on_executive', profile: ctx.profile_code });
  }
  if (ctx.kpi_hierarchy_delivery_integrity && !ctx.kpi_hierarchy_delivery_integrity.stable) {
    mismatches.push({ type: 'kpi_hierarchy_unstable', source: 'kpi' });
  }

  if (mismatches.length && flags.isRuntimeObservationObservabilityEnabled()) {
    logPhaseZ0('HIERARCHY_MISMATCH_DETECTED', { count: mismatches.length, tenant_id: ctx.tenant_id, shadow_only: true });
  }

  return { mismatch_detected: mismatches.length > 0, mismatches, auto_apply: false };
}

module.exports = { observeHierarchyMismatch };
