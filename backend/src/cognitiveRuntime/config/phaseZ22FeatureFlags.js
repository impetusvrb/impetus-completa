'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function _mode(name, defaultMode = 'off') {
  const v = String(process.env[name] || defaultMode).toLowerCase();
  if (v === 'controlled' || v === 'shadow' || v === 'pilot' || v === 'on' || v === 'enrich') {
    return v === 'on' ? 'controlled' : v;
  }
  return 'off';
}

const PILOT_PROFILES = Object.freeze(['coordinator_quality']);

module.exports = {
  renderPromotionMode: () => _mode('IMPETUS_COGNITIVE_RENDER_PROMOTION', 'off'),
  isRenderPromotionControlled: () =>
    _mode('IMPETUS_COGNITIVE_RENDER_PROMOTION', 'off') === 'controlled' ||
    _mode('IMPETUS_COGNITIVE_RENDER_PROMOTION', 'off') === 'pilot',
  isRenderPromotionShadowCompare: () =>
    _mode('IMPETUS_COGNITIVE_RENDER_PROMOTION', 'off') === 'shadow' ||
    _flag('IMPETUS_RENDER_PROMOTION_OBSERVABILITY', true),
  isQualityRenderPromotionPilot: () => {
    const q = String(process.env.IMPETUS_QUALITY_RENDER_PROMOTION || 'pilot').toLowerCase();
    return q === 'pilot' || q === 'on' || q === 'controlled';
  },
  pilotProfiles: () => PILOT_PROFILES,
  isPilotProfile: (profileCode = '') =>
    PILOT_PROFILES.includes(String(profileCode || '').trim()),
  minBindingRatioForRender: () => {
    const v = Number(process.env.IMPETUS_Z22_MIN_BINDING_RATIO);
    return Number.isFinite(v) && v > 0 ? v : 0.5;
  },
  maxPromotedWidgets: () => {
    const v = Number(process.env.IMPETUS_Z22_MAX_PROMOTED_WIDGETS);
    return Number.isFinite(v) && v > 0 ? Math.min(v, 10) : 8;
  },
  maxGenericSuppressed: () => {
    const v = Number(process.env.IMPETUS_Z22_MAX_GENERIC_SUPPRESSED);
    return Number.isFinite(v) && v > 0 ? Math.min(v, 6) : 4;
  },
  globalReplace: false,
  removeLegacyWidgets: false,
  autoRemediation: false,
  boundaryGovernance: false
};
