'use strict';

/** Manifesto ENVIRONMENT — SGA/EHS enterprise (/app/environment/operational). */
const ENVIRONMENT_NAVIGATION_MANIFEST = Object.freeze([
  {
    id: 'environment_operational',
    label: 'Ambiental — Operacional',
    path: '/app/environment/operational',
    requires: { operational: true },
    bands: ['operator', 'technician', 'supervisor', 'coordinator', 'manager', 'director', 'auditor']
  },
  {
    id: 'environment_water',
    label: 'Água & balanço hídrico',
    path: '/app/environment/operational?view=water',
    requires: { operational: true },
    bands: ['operator', 'technician', 'supervisor']
  },
  {
    id: 'environment_effluent',
    label: 'ETA / ETE & efluentes',
    path: '/app/environment/operational?view=effluent',
    requires: { operational: true },
    bands: ['operator', 'technician', 'supervisor', 'coordinator']
  },
  {
    id: 'environment_emissions',
    label: 'Emissões & GEE',
    path: '/app/environment/operational?view=emissions',
    requires: { operational: true },
    bands: ['technician', 'supervisor', 'coordinator']
  },
  {
    id: 'environment_waste',
    label: 'Resíduos & MTR',
    path: '/app/environment/operational?view=waste',
    requires: { operational: true },
    bands: ['operator', 'technician', 'supervisor']
  },
  {
    id: 'environment_field',
    label: 'Monitoramento de campo',
    path: '/app/environment/operational?view=field',
    requires: { operational: true },
    bands: ['operator', 'technician']
  },
  {
    id: 'environment_esg',
    label: 'ESG & condicionantes',
    path: '/app/environment/operational?view=esg',
    requires: { governance: true },
    bands: ['coordinator', 'manager', 'director', 'auditor']
  },
  {
    id: 'environment_compliance',
    label: 'Compliance ambiental',
    path: '/app/environment/operational?view=compliance',
    requires: { governance: true },
    bands: ['coordinator', 'manager', 'director', 'auditor']
  },
  {
    id: 'environment_carbon',
    label: 'Carbono / GEE',
    path: '/app/environment/operational?view=carbon',
    requires: { governance: true },
    bands: ['coordinator', 'manager', 'director', 'auditor']
  },
  {
    id: 'environment_energy',
    label: 'Energia industrial',
    path: '/app/environment/operational?view=energy',
    requires: { governance: true },
    bands: ['coordinator', 'manager', 'director', 'auditor']
  },
  {
    id: 'environment_sustainability',
    label: 'Sustentabilidade',
    path: '/app/environment/operational?view=sustainability',
    requires: { governance: true },
    bands: ['manager', 'director', 'auditor']
  },
  {
    id: 'environment_telemetry',
    label: 'Telemetria ambiental',
    path: '/app/environment/operational?view=telemetry',
    requires: { governance: true },
    bands: ['coordinator', 'manager', 'director', 'auditor']
  },
  {
    id: 'environment_governance',
    label: 'Governança ambiental',
    path: '/app/environment/operational?view=governance',
    requires: { governance: true },
    bands: ['manager', 'director', 'auditor']
  },
  {
    id: 'environment_intelligence',
    label: 'Inteligência ambiental',
    path: '/app/environment/operational?view=intelligence',
    requires: { governance: true },
    bands: ['manager', 'director', 'auditor']
  },
  {
    id: 'environment_rollout',
    label: 'Rollout enterprise ambiental',
    path: '/app/environment/operational?view=rollout',
    requires: { executive: true },
    bands: ['director', 'auditor']
  },
  {
    id: 'environment_maturity',
    label: 'Maturidade cognitiva ambiental',
    path: '/app/environment/operational?view=maturity',
    requires: { executive: true },
    bands: ['manager', 'director', 'auditor']
  },
  {
    id: 'environment_widgets_only',
    label: 'Ambiental (contexto)',
    path: '/app/environment/operational?context=widgets',
    requires: { operational: true },
    bands: ['production']
  }
]);

module.exports = { ENVIRONMENT_NAVIGATION_MANIFEST };
