'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function _mode(name, defaultMode = 'off') {
  const v = String(process.env[name] || defaultMode).toLowerCase();
  if (['on', 'shadow', 'controlled', 'pilot', 'environmental_native', 'active'].includes(v)) {
    return v === 'on' ? 'environmental_native' : v;
  }
  return 'off';
}

const PILOT_PROFILES = Object.freeze([
  'coordinator_environmental',
  'manager_environmental',
  'supervisor_environmental'
]);

module.exports = {
  environmentalNativeCockpitMode: () => _mode('IMPETUS_ENVIRONMENTAL_NATIVE_COCKPIT', 'off'),
  isEnvironmentalNativeCockpitPilot: () => {
    const m = String(process.env.IMPETUS_ENVIRONMENTAL_NATIVE_COCKPIT || 'off').toLowerCase();
    return m === 'pilot' || m === 'on' || m === 'environmental_native';
  },
  isEnvironmentalCognitiveRuntimeActive: () => {
    const m = _mode('IMPETUS_ENVIRONMENTAL_COGNITIVE_RUNTIME', 'off');
    return m === 'environmental_native' || m === 'shadow' || m === 'controlled' || m === 'active';
  },
  isEnvironmentalCognitiveRuntimeShadow: () => _mode('IMPETUS_ENVIRONMENTAL_COGNITIVE_RUNTIME', 'off') === 'shadow',
  isEnvironmentalRenderPromotionControlled: () =>
    _mode('IMPETUS_ENVIRONMENTAL_RENDER_PROMOTION', 'off') === 'controlled' ||
    _mode('IMPETUS_ENVIRONMENTAL_RENDER_PROMOTION', 'off') === 'pilot',
  isEnvironmentalGovernanceEnabled: () => _flag('IMPETUS_ENVIRONMENTAL_GOVERNANCE', true),
  isEnvironmentalObservabilityEnabled: () => _flag('IMPETUS_ENVIRONMENTAL_OBSERVABILITY', true),
  isEnvironmentalDensityGovernorEnabled: () => _flag('IMPETUS_ENVIRONMENTAL_DENSITY_GOVERNOR', true),
  isEnvironmentalLiveValidationEnabled: () => {
    const m = String(process.env.IMPETUS_ENVIRONMENTAL_LIVE_VALIDATION || 'off').toLowerCase();
    return m === 'shadow' || m === 'on' || m === 'active';
  },
  isRegulatoryGovernanceEnabled: () => _flag('IMPETUS_REGULATORY_GOVERNANCE', true),
  isEnvironmentalRuntimeHealthEnabled: () => _flag('IMPETUS_ENVIRONMENTAL_RUNTIME_HEALTH', true),
  isEnvironmentalAlertProtectionEnabled: () => _flag('IMPETUS_ENVIRONMENTAL_ALERT_PROTECTION', true),
  isEnvironmentalPerformanceObservabilityEnabled: () => _flag('IMPETUS_ENVIRONMENTAL_PERFORMANCE_OBSERVABILITY', true),
  environmentalLiveValidationMode: () => String(process.env.IMPETUS_ENVIRONMENTAL_LIVE_VALIDATION || 'off').toLowerCase(),
  pilotProfiles: () => PILOT_PROFILES,
  isPilotProfile: (code) => {
    const pc = String(code || '').toLowerCase();
    return (
      PILOT_PROFILES.some((p) => pc === p || pc.includes(p)) ||
      pc.includes('environmental') ||
      pc.includes('ambiental') ||
      pc === 'sustainability' ||
      pc.includes('esg') && pc.includes('coord')
    );
  },
  maxCenters: () => 6,
  maxCriticalAlerts: () => 3,
  getProfileWeights: (profileCode = '') => {
    const pc = String(profileCode || '').toLowerCase();
    if (pc.includes('manager')) return { operational: 0.45, governance: 0.4, strategic: 0.15 };
    return { operational: 0.5, governance: 0.38, strategic: 0.12 };
  },
  globalReplace: false,
  autoRemediation: false
};
