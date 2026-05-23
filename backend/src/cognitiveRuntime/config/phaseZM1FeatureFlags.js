'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function _mode(name, defaultMode = 'off') {
  const v = String(process.env[name] || defaultMode).toLowerCase();
  if (['on', 'shadow', 'controlled', 'pilot', 'maintenance_native', 'active'].includes(v)) {
    return v === 'on' ? 'maintenance_native' : v;
  }
  return 'off';
}

const PILOT_PROFILES = Object.freeze([
  'coordinator_maintenance',
  'manager_maintenance',
  'supervisor_maintenance',
  'pcm',
  'technician_maintenance'
]);

module.exports = {
  maintenanceNativeCockpitMode: () => _mode('IMPETUS_MAINTENANCE_NATIVE_COCKPIT', 'off'),
  isMaintenanceNativeCockpitPilot: () => {
    const m = String(process.env.IMPETUS_MAINTENANCE_NATIVE_COCKPIT || 'off').toLowerCase();
    return m === 'pilot' || m === 'on' || m === 'maintenance_native';
  },
  isMaintenanceCognitiveRuntimeActive: () => {
    const m = _mode('IMPETUS_MAINTENANCE_COGNITIVE_RUNTIME', 'off');
    return m === 'maintenance_native' || m === 'shadow' || m === 'controlled' || m === 'active';
  },
  isMaintenanceCognitiveRuntimeShadow: () => _mode('IMPETUS_MAINTENANCE_COGNITIVE_RUNTIME', 'off') === 'shadow',
  isMaintenanceRenderPromotionControlled: () =>
    _mode('IMPETUS_MAINTENANCE_RENDER_PROMOTION', 'off') === 'controlled' ||
    _mode('IMPETUS_MAINTENANCE_RENDER_PROMOTION', 'off') === 'pilot',
  isMaintenanceDensityGovernorEnabled: () => _flag('IMPETUS_MAINTENANCE_DENSITY_GOVERNOR', true),
  isMaintenanceObservabilityEnabled: () => _flag('IMPETUS_MAINTENANCE_OBSERVABILITY', true),
  isMaintenanceLiveValidationEnabled: () => {
    const m = String(process.env.IMPETUS_MAINTENANCE_LIVE_VALIDATION || 'shadow').toLowerCase();
    return m === 'shadow' || m === 'on' || m === 'active';
  },
  pilotProfiles: () => PILOT_PROFILES,
  isPilotProfile: (code) => {
    const pc = String(code || '').toLowerCase();
    return (
      PILOT_PROFILES.some((p) => pc === p || pc.includes(p)) ||
      pc.includes('maintenance') ||
      pc.includes('manutencao') ||
      pc.includes('manutenção') ||
      pc === 'pcm' ||
      pc.includes('mecanic')
    );
  },
  maxCenters: () => 6,
  maxWidgets: () => 8,
  maxCriticalAlerts: () => 3,
  globalReplace: false,
  autoRemediation: false,
  autoMaintenance: false
};
