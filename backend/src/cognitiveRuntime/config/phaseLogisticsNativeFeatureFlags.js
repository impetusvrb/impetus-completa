'use strict';

/**
 * INC-038 — Feature flags logistics_native (foundation).
 * Default: off / inactive até INC-039+.
 */

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function _mode(name, defaultMode = 'off') {
  const v = String(process.env[name] || defaultMode).toLowerCase();
  if (['on', 'shadow', 'controlled', 'pilot', 'logistics_native', 'active'].includes(v)) {
    return v === 'on' ? 'logistics_native' : v;
  }
  return 'off';
}

const PILOT_PROFILES = Object.freeze([
  'coordinator_logistics',
  'manager_logistics',
  'supervisor_logistics'
]);

module.exports = {
  logisticsNativeCockpitMode: () => _mode('IMPETUS_LOGISTICS_NATIVE_COCKPIT', 'off'),
  isLogisticsNativeCockpitPilot: () => {
    const m = String(process.env.IMPETUS_LOGISTICS_NATIVE_COCKPIT || 'off').toLowerCase();
    return m === 'pilot' || m === 'on' || m === 'logistics_native';
  },
  isLogisticsCognitiveRuntimeActive: () => {
    const m = _mode('IMPETUS_LOGISTICS_COGNITIVE_RUNTIME_ENABLED', 'off');
    return m === 'logistics_native' || m === 'shadow' || m === 'controlled' || m === 'active';
  },
  isLogisticsCognitiveRuntimeShadow: () =>
    _mode('IMPETUS_LOGISTICS_COGNITIVE_RUNTIME_ENABLED', 'off') === 'shadow',
  isLogisticsEngineBridgeEnabled: () => _flag('IMPETUS_LOGISTICS_ENGINE_BRIDGE_ENABLED', false),
  isLogisticsRenderPromotionControlled: () => {
    const m = _mode('IMPETUS_LOGISTICS_RENDER_PROMOTION', 'off');
    return m === 'controlled' || m === 'pilot';
  },
  isLogisticsFoundationAttachmentEnabled: () => _flag('IMPETUS_LOGISTICS_RUNTIME_FOUNDATION', true),
  isLogisticsSignalDiagnosticsEnabled: () => _flag('IMPETUS_LOGISTICS_SIGNAL_DIAGNOSTICS', false),
  pilotProfiles: () => PILOT_PROFILES,
  isPilotProfile: (code) => {
    const pc = String(code || '').toLowerCase();
    return (
      PILOT_PROFILES.some((p) => pc === p || pc.includes(p)) ||
      pc.includes('logistics') ||
      pc.includes('logistica') ||
      pc.includes('logística') ||
      pc.includes('almox') ||
      pc.includes('expedicao') ||
      pc.includes('expedição')
    );
  },
  maxCenters: () => 8,
  maxWidgets: () => 8,
  globalReplace: false,
  autoRemediation: false
};
