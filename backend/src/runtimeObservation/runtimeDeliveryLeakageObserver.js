'use strict';

const flags = require('../phaseZ0/config/phaseZ0FeatureFlags');
const { logPhaseZ0 } = require('../phaseZ0/phaseZ0Logger');

const CROSS_DOMAIN_RULES = [
  { axis: 'hr', denied_modules: ['environment_intelligence', 'safety_intelligence', 'quality_intelligence', 'anomaly_detection', 'manuia'], label: 'RH não deve ver domínios industriais/SST/emissões' },
  { axis: 'finance', denied_modules: ['environment_intelligence', 'quality_intelligence', 'manuia', 'anomaly_detection'], label: 'Financeiro isolado de operação pesada' },
  { axis: 'safety', denied_modules: ['environment_intelligence'], label: 'SST operacional sem emissões corporativas' },
  { axis: 'environmental', denied_modules: ['hr_intelligence'], label: 'Ambiental sem RH' }
];

function observeDeliveryLeakage(ctx = {}) {
  const leaks = [];
  const axis = String(ctx.canonical_identity?.domain_axis || ctx.functional_axis || '').toLowerCase();
  const modules = ctx.visible_modules || ctx.delivered_modules || [];

  for (const rule of CROSS_DOMAIN_RULES) {
    if (axis !== rule.axis && !axis.includes(rule.axis)) continue;
    for (const mod of modules) {
      if (rule.denied_modules.includes(mod)) {
        leaks.push({ module: mod, axis, rule: rule.label, severity: 'high' });
      }
    }
  }

  if (ctx.kpi_governance?.leakage?.detected) {
    leaks.push({ type: 'kpi_leakage', count: ctx.kpi_governance.leakage.count });
  }

  if (leaks.length && flags.isRuntimeObservationObservabilityEnabled()) {
    logPhaseZ0('CONTEXTUAL_DELIVERY_LEAKAGE_DETECTED', {
      tenant_id: ctx.tenant_id,
      count: leaks.length,
      shadow_only: !flags.isRuntimeObservationEnabled()
    });
  }

  return {
    leakage_detected: leaks.length > 0,
    leaks,
    leak_count: leaks.length,
    auto_block: false,
    recommendation_only: true
  };
}

module.exports = { observeDeliveryLeakage, CROSS_DOMAIN_RULES };
