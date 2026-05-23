'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function _mode(name, defaultMode = 'off') {
  const v = String(process.env[name] || defaultMode).toLowerCase();
  if (['on', 'shadow', 'controlled', 'pilot', 'safety_native', 'active'].includes(v)) {
    return v === 'on' ? 'safety_native' : v;
  }
  return 'off';
}

const PILOT_PROFILES = Object.freeze([
  'coordinator_safety',
  'supervisor_safety',
  'manager_safety',
  'safety_technician',
  'technician_safety'
]);

const TECHNICIAN_PROFILES = Object.freeze(['safety_technician', 'technician_safety']);

module.exports = {
  sstNativeCockpitMode: () => _mode('IMPETUS_SST_NATIVE_COCKPIT', 'off'),
  isSstNativeCockpitPilot: () => {
    const m = String(process.env.IMPETUS_SST_NATIVE_COCKPIT || 'off').toLowerCase();
    return m === 'pilot' || m === 'on' || m === 'safety_native';
  },
  isSafetyCognitiveRuntimeActive: () => {
    const m = _mode('IMPETUS_SAFETY_COGNITIVE_RUNTIME', 'off');
    return m === 'safety_native' || m === 'shadow' || m === 'controlled' || m === 'active';
  },
  isSafetyCognitiveRuntimeShadow: () => _mode('IMPETUS_SAFETY_COGNITIVE_RUNTIME', 'off') === 'shadow',
  isSafetyRenderPromotionControlled: () =>
    _mode('IMPETUS_SAFETY_RENDER_PROMOTION', 'off') === 'controlled' ||
    _mode('IMPETUS_SAFETY_RENDER_PROMOTION', 'off') === 'pilot',
  isSafetyDensityGovernorEnabled: () => _flag('IMPETUS_SAFETY_DENSITY_GOVERNOR', true),
  isSstObservabilityEnabled: () => _flag('IMPETUS_SST_OBSERVABILITY', true),
  pilotProfiles: () => PILOT_PROFILES,
  isPilotProfile: (code) => {
    const pc = String(code || '').toLowerCase();
    return PILOT_PROFILES.some((p) => pc === p || pc.includes('safety') || pc.includes('_sst'));
  },
  isTechnicianProfile: (code) => TECHNICIAN_PROFILES.some((p) => String(code || '').includes(p)),
  maxCenters: () => {
    const v = Number(process.env.IMPETUS_Z25_MAX_CENTERS);
    return Number.isFinite(v) && v > 0 ? Math.min(v, 8) : 6;
  },
  getProfileWeights: (profileCode = '') => {
    if (module.exports.isTechnicianProfile(profileCode)) {
      return { operational: 0.8, governance: 0.15, strategic: 0.05 };
    }
    return { operational: 0.65, governance: 0.25, strategic: 0.1 };
  },
  globalReplace: false,
  autoRemediation: false
};
