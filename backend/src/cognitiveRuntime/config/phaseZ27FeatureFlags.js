'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function _mode(name, defaultMode = 'off') {
  const v = String(process.env[name] || defaultMode).toLowerCase();
  if (['on', 'shadow', 'controlled', 'pilot', 'executive_boardroom', 'active'].includes(v)) {
    return v === 'on' ? 'executive_boardroom' : v;
  }
  return 'off';
}

const PILOT_PROFILES = Object.freeze([
  'executive_director',
  'ceo',
  'cfo',
  'director_industrial',
  'director_general',
  'diretor'
]);

module.exports = {
  executiveBoardroomMode: () => _mode('IMPETUS_EXECUTIVE_BOARDROOM', 'off'),
  isExecutiveBoardroomPilot: () => {
    const m = String(process.env.IMPETUS_EXECUTIVE_BOARDROOM || 'off').toLowerCase();
    return m === 'pilot' || m === 'on' || m === 'executive_boardroom';
  },
  isExecutiveCognitiveRuntimeActive: () => {
    const m = _mode('IMPETUS_EXECUTIVE_COGNITIVE_RUNTIME', 'off');
    return m === 'executive_boardroom' || m === 'shadow' || m === 'controlled' || m === 'active';
  },
  isExecutiveCognitiveRuntimeShadow: () => _mode('IMPETUS_EXECUTIVE_COGNITIVE_RUNTIME', 'off') === 'shadow',
  isExecutiveRenderPromotionControlled: () =>
    _mode('IMPETUS_EXECUTIVE_RENDER_PROMOTION', 'off') === 'controlled' ||
    _mode('IMPETUS_EXECUTIVE_RENDER_PROMOTION', 'off') === 'pilot',
  isExecutiveDensityGovernorEnabled: () => _flag('IMPETUS_EXECUTIVE_DENSITY_GOVERNOR', true),
  isExecutiveObservabilityEnabled: () => _flag('IMPETUS_EXECUTIVE_OBSERVABILITY', true),
  isExecutiveLiveValidationEnabled: () => {
    const m = String(process.env.IMPETUS_EXECUTIVE_LIVE_VALIDATION || 'shadow').toLowerCase();
    return m === 'shadow' || m === 'on' || m === 'active';
  },
  pilotProfiles: () => PILOT_PROFILES,
  isPilotProfile: (code) => {
    const pc = String(code || '').toLowerCase();
    return (
      PILOT_PROFILES.some((p) => pc === p || pc.includes(p)) ||
      pc.includes('executive') ||
      pc.includes('diretor') ||
      pc.includes('ceo') ||
      pc.includes('cfo') ||
      (pc.includes('director') && !pc.includes('quality') && !pc.includes('environmental'))
    );
  },
  maxCenters: () => 5,
  maxWidgets: () => 7,
  maxStrategicKpis: () => 5,
  maxCriticalAlerts: () => 3,
  globalReplace: false,
  autoRemediation: false
};
