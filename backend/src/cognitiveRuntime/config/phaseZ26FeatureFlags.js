'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function _mode(name, defaultMode = 'off') {
  const v = String(process.env[name] || defaultMode).toLowerCase();
  if (['on', 'shadow', 'controlled', 'pilot', 'hr_native', 'people_native', 'active'].includes(v)) {
    return v === 'on' ? 'hr_native' : v;
  }
  return 'off';
}

const PILOT_PROFILES = Object.freeze([
  'coordinator_hr',
  'manager_hr',
  'supervisor_hr',
  'hr_management',
  'hr_analyst'
]);

const EXECUTIVE_HR_PROFILES = Object.freeze(['manager_hr', 'director_hr']);

module.exports = {
  hrNativeCockpitMode: () => _mode('IMPETUS_HR_NATIVE_COCKPIT', 'off'),
  isHrNativeCockpitPilot: () => {
    const m = String(process.env.IMPETUS_HR_NATIVE_COCKPIT || 'off').toLowerCase();
    return m === 'pilot' || m === 'on' || m === 'hr_native' || m === 'people_native';
  },
  isHrCognitiveRuntimeActive: () => {
    const m = _mode('IMPETUS_HR_COGNITIVE_RUNTIME', 'off');
    return m === 'hr_native' || m === 'people_native' || m === 'shadow' || m === 'controlled' || m === 'active';
  },
  isHrCognitiveRuntimeShadow: () => _mode('IMPETUS_HR_COGNITIVE_RUNTIME', 'off') === 'shadow',
  isHrRenderPromotionControlled: () =>
    _mode('IMPETUS_HR_RENDER_PROMOTION', 'off') === 'controlled' ||
    _mode('IMPETUS_HR_RENDER_PROMOTION', 'off') === 'pilot',
  isHrDensityGovernorEnabled: () => _flag('IMPETUS_HR_DENSITY_GOVERNOR', true),
  isHrObservabilityEnabled: () => _flag('IMPETUS_HR_OBSERVABILITY', true),
  pilotProfiles: () => PILOT_PROFILES,
  isPilotProfile: (code) => {
    const pc = String(code || '').toLowerCase();
    return PILOT_PROFILES.some((p) => pc === p || pc.includes('_hr') || pc === 'hr_management' || pc.includes('rh'));
  },
  isExecutiveHrProfile: (code) => EXECUTIVE_HR_PROFILES.some((p) => String(code || '').includes(p)),
  maxCenters: () => {
    const v = Number(process.env.IMPETUS_Z26_MAX_CENTERS);
    return Number.isFinite(v) && v > 0 ? Math.min(v, 8) : 6;
  },
  getProfileWeights: (profileCode = '') => {
    if (module.exports.isExecutiveHrProfile(profileCode)) {
      return { operational: 0.2, governance: 0.4, strategic: 0.4 };
    }
    return { operational: 0.7, governance: 0.2, strategic: 0.1 };
  },
  globalReplace: false,
  autoRemediation: false
};
