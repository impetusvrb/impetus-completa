'use strict';

/** Visibilidade por audiência contextual (Etapa 6). */
const AUDIENCE_MANIFEST_IDS = Object.freeze({
  operator: [
    'environment_effluent',
    'environment_water',
    'environment_field',
    'environment_operational',
    'environment_telemetry'
  ],
  technician: [
    'environment_field',
    'environment_waste',
    'environment_compliance',
    'environment_effluent',
    'environment_emissions',
    'environment_operational'
  ],
  coordinator: [
    'environment_esg',
    'environment_emissions',
    'environment_sustainability',
    'environment_telemetry',
    'environment_intelligence',
    'environment_cognitive'
  ],
  manager: [
    'environment_esg',
    'environment_emissions',
    'environment_sustainability',
    'environment_telemetry',
    'environment_intelligence',
    'environment_executive'
  ],
  director: [
    'environment_sustainability',
    'environment_carbon',
    'environment_executive',
    'environment_intelligence',
    'environment_governance',
    'environment_rollout'
  ],
  supervisor: ['environment_effluent', 'environment_emissions', 'environment_waste', 'environment_operational'],
  auditor: ['environment_compliance', 'environment_governance', 'environment_rollout'],
  production: ['environment_widgets_only']
});

function resolveEnvironmentAudienceBand(user) {
  if (!user) return 'production';
  const role = String(user.role || user.perfil || '').toLowerCase();
  const area = String(user.functional_area || user.area || '').toLowerCase();
  if (['diretor', 'ceo', 'director'].some((k) => role.includes(k))) return 'director';
  if (role.includes('gerente') || role.includes('manager')) return 'manager';
  if (role.includes('coordenador')) return 'coordinator';
  if (role.includes('supervisor')) return 'supervisor';
  if (['ambiental', 'environment', 'eta', 'ete', 'efluente'].some((k) => area.includes(k))) return 'technician';
  if (role.includes('operador') || role.includes('operator')) return 'operator';
  if (role.includes('admin') || role.includes('auditor')) return 'auditor';
  return 'production';
}

function resolveAudienceManifestIds(band) {
  return AUDIENCE_MANIFEST_IDS[band] || AUDIENCE_MANIFEST_IDS.production;
}

module.exports = {
  AUDIENCE_MANIFEST_IDS,
  resolveEnvironmentAudienceBand,
  resolveAudienceManifestIds
};
