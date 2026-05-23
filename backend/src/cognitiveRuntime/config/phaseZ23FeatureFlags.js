'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function _mode(name, defaultMode = 'off') {
  const v = String(process.env[name] || defaultMode).toLowerCase();
  if (v === 'quality_native' || v === 'controlled' || v === 'shadow' || v === 'on' || v === 'pilot') {
    return v === 'on' ? 'quality_native' : v;
  }
  return 'off';
}

const PILOT_PROFILES = Object.freeze(['coordinator_quality']);

module.exports = {
  specializedCockpitMode: () => _mode('IMPETUS_SPECIALIZED_COCKPIT_RUNTIME', 'off'),
  isSpecializedCockpitActive: () => {
    const m = _mode('IMPETUS_SPECIALIZED_COCKPIT_RUNTIME', 'off');
    return m === 'quality_native' || m === 'controlled' || m === 'pilot';
  },
  isSpecializedCockpitShadow: () => _mode('IMPETUS_SPECIALIZED_COCKPIT_RUNTIME', 'off') === 'shadow',
  isQualityNativeCockpitPilot: () => {
    const q = String(process.env.IMPETUS_QUALITY_NATIVE_COCKPIT || 'off').toLowerCase();
    return q === 'pilot' || q === 'on' || q === 'quality_native';
  },
  isCockpitBalancerEnabled: () => _flag('IMPETUS_COGNITIVE_COCKPIT_BALANCER', false),
  isDensityGovernorEnabled: () => _flag('IMPETUS_COCKPIT_DENSITY_GOVERNOR', false),
  pilotProfiles: () => PILOT_PROFILES,
  isPilotProfile: (code) => PILOT_PROFILES.includes(String(code || '').trim()),
  maxCenters: () => {
    const v = Number(process.env.IMPETUS_Z23_MAX_CENTERS);
    return Number.isFinite(v) && v > 0 ? Math.min(v, 8) : 6;
  },
  maxMetricsPerCenter: () => {
    const v = Number(process.env.IMPETUS_Z23_MAX_METRICS_PER_CENTER);
    return Number.isFinite(v) && v > 0 ? Math.min(v, 12) : 8;
  },
  domainWeights: () => ({
    operational: 0.7,
    governance: 0.2,
    strategic: 0.1
  }),
  globalReplace: false,
  autoRemediation: false
};
