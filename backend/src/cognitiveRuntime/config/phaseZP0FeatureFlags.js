'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function _mode(name, defaultMode = 'off') {
  const v = String(process.env[name] || defaultMode).toLowerCase();
  if (['on', 'shadow', 'controlled', 'pilot', 'production_native', 'active'].includes(v)) {
    return v === 'on' ? 'production_native' : v;
  }
  return 'off';
}

const PILOT_PROFILES = Object.freeze([
  'coordinator_production',
  'manager_production',
  'supervisor_production',
  'analyst_pcp',
  'director_industrial'
]);

module.exports = {
  productionNativeCockpitMode: () => _mode('IMPETUS_PRODUCTION_NATIVE_COCKPIT', 'off'),
  isProductionNativeCockpitPilot: () => {
    const m = String(process.env.IMPETUS_PRODUCTION_NATIVE_COCKPIT || 'off').toLowerCase();
    return m === 'pilot' || m === 'on' || m === 'production_native';
  },
  isProductionCognitiveRuntimeActive: () => {
    const m = _mode('IMPETUS_PRODUCTION_COGNITIVE_RUNTIME', 'off');
    return m === 'production_native' || m === 'shadow' || m === 'controlled' || m === 'active';
  },
  isProductionCognitiveRuntimeShadow: () => _mode('IMPETUS_PRODUCTION_COGNITIVE_RUNTIME', 'off') === 'shadow',
  isProductionRenderPromotionControlled: () =>
    _mode('IMPETUS_PRODUCTION_RENDER_PROMOTION', 'off') === 'controlled' ||
    _mode('IMPETUS_PRODUCTION_RENDER_PROMOTION', 'off') === 'pilot',
  isProductionTelemetryRuntimeEnabled: () => _flag('IMPETUS_PRODUCTION_TELEMETRY_RUNTIME', true),
  isProductionDensityGovernorEnabled: () => _flag('IMPETUS_PRODUCTION_DENSITY_GOVERNOR', true),
  isProductionObservabilityEnabled: () => _flag('IMPETUS_PRODUCTION_OBSERVABILITY', true),
  pilotProfiles: () => PILOT_PROFILES,
  isPilotProfile: (code) => {
    const pc = String(code || '').toLowerCase();
    return (
      PILOT_PROFILES.some((p) => pc === p || pc.includes(p)) ||
      pc.includes('production') ||
      pc.includes('producao') ||
      pc === 'analyst_pcp'
    );
  },
  maxCenters: () => {
    const v = Number(process.env.IMPETUS_ZP0_MAX_CENTERS);
    return Number.isFinite(v) && v > 0 ? Math.min(v, 6) : 6;
  },
  getProfileWeights: (profileCode = '') => {
    const pc = String(profileCode || '').toLowerCase();
    if (pc.includes('supervisor') || pc.includes('operator')) {
      return { operational: 0.9, governance: 0.08, strategic: 0.02 };
    }
    if (pc.includes('manager') || pc.includes('director')) {
      return { operational: 0.5, governance: 0.3, strategic: 0.2 };
    }
    return { operational: 0.85, governance: 0.1, strategic: 0.05 };
  },
  globalReplace: false,
  autoRemediation: false
};
