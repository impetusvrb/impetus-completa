'use strict';

const flags = require('../../../config/phaseP1EnvironmentalFeatureFlags');
const { loadEnvironmentalTenantSignals } = require('../bridge/environmentalSignalLoader');

const DENIED = /ebitda|oee|turnover|absenteismo|production_shift|faturamento/i;

function isEnvironmentalNativeKpiProfile(profileCode = '', functionalArea = '') {
  const pc = String(profileCode || '').toLowerCase();
  const fa = String(functionalArea || '').toLowerCase();
  return flags.isPilotProfile(pc) || fa === 'environmental' || fa === 'ambiental' || fa === 'sustainability';
}

async function buildEnvironmentalNativeKpis(user = {}, ctx = {}) {
  const signals = await loadEnvironmentalTenantSignals(user, { ...ctx, mock_signals: ctx.mock_signals });
  const op = signals.operational || {};
  const kpis = [
    { id: 'env_emissions', key: 'env_emissions', title: 'Emissões', value: op.emissions_tco2e != null ? `${op.emissions_tco2e} t` : '—', color: 'green', icon: 'activity' },
    { id: 'env_waste', key: 'env_waste', title: 'Resíduos', value: op.waste_tonnes ?? 0, color: 'amber', icon: 'target' },
    { id: 'env_compliance', key: 'env_compliance', title: 'Licenças a vencer', value: op.licenses_expiring ?? 0, color: 'red', icon: 'alert' },
    { id: 'env_water', key: 'env_water', title: 'Água', value: op.water_proxy ?? '—', color: 'cyan', icon: 'zap' },
    { id: 'env_energy', key: 'env_energy', title: 'Energia', value: op.energy_proxy ?? '—', color: 'teal', icon: 'zap' },
    { id: 'env_carbon', key: 'env_carbon', title: 'Carbono', value: op.emissions_tco2e ?? '—', color: 'purple', icon: 'trending' },
    { id: 'env_esg', key: 'env_esg', title: 'ESG contextual', value: op.esg_score ?? '—', color: 'blue', icon: 'brain' },
    { id: 'env_audit', key: 'env_audit', title: 'Auditorias abertas', value: op.audit_open ?? 0, color: 'orange', icon: 'map' },
    { id: 'env_licenses', key: 'env_licenses', title: 'Licenças activas', value: op.licenses_total ?? 0, color: 'green', icon: 'target' },
    { id: 'env_incidents', key: 'env_incidents', title: 'Incidentes ambientais', value: op.incidents_open ?? 0, color: 'red', icon: 'alert' }
  ];
  return kpis.filter((k) => !DENIED.test(k.title));
}

module.exports = { isEnvironmentalNativeKpiProfile, buildEnvironmentalNativeKpis };
