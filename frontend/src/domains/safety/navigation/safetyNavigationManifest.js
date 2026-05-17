/**
 * Manifesto declarativo SST — rotas canónicas via /app/safety/operational (+ query view).
 */

/** @typedef {{ id: string, label: string, path: string, requires: { governance?: boolean, executive?: boolean, operational?: boolean }, bands: import('./safetyAudienceNavigation.js').SafetyAudienceBand[] }} SafetyNavManifestItem */

/** @type {SafetyNavManifestItem[]} */
export const SAFETY_NAVIGATION_MANIFEST = Object.freeze([
  {
    id: 'safety_operational',
    label: 'SST — Operacional',
    path: '/app/safety/operational',
    requires: { operational: true },
    bands: ['operator', 'coordinator', 'director', 'auditor', 'sst_technician']
  },
  {
    id: 'safety_field_inspection',
    label: 'Inspeção de campo',
    path: '/app/safety/operational/inspection',
    requires: { operational: true },
    bands: ['operator', 'coordinator', 'sst_technician']
  },
  {
    id: 'safety_incident',
    label: 'Incidentes & quase-acidentes',
    path: '/app/safety/operational?view=incident',
    requires: { operational: true },
    bands: ['operator', 'coordinator', 'sst_technician']
  },
  {
    id: 'safety_ptw_loto',
    label: 'PT / APR / LOTO',
    path: '/app/safety/operational?view=ptw',
    requires: { governance: true },
    bands: ['operator', 'coordinator', 'sst_technician']
  },
  {
    id: 'safety_epi_epc',
    label: 'EPI / EPC',
    path: '/app/safety/operational?view=epi',
    requires: { governance: true },
    bands: ['coordinator', 'sst_technician']
  },
  {
    id: 'safety_risk_ghe',
    label: 'GHE & Matriz de Risco',
    path: '/app/safety/operational?view=governance',
    requires: { governance: true },
    bands: ['coordinator', 'director', 'auditor', 'sst_technician']
  },
  {
    id: 'safety_telemetry',
    label: 'Telemetria SST',
    path: '/app/safety/operational?view=telemetry',
    requires: { governance: true },
    bands: ['coordinator', 'director', 'auditor']
  },
  {
    id: 'safety_cognitive',
    label: 'Inteligência SST',
    path: '/app/safety/operational?view=cognitive',
    requires: { executive: true },
    bands: ['coordinator', 'director']
  },
  {
    id: 'safety_rollout',
    label: 'Rollout enterprise SST',
    path: '/app/safety/operational?view=rollout',
    requires: { executive: true },
    bands: ['director', 'auditor']
  },
  {
    id: 'safety_pilot_validation',
    label: 'Validação operacional & pilot',
    path: '/app/safety/operational?view=pilot',
    requires: { operational: true },
    bands: ['coordinator', 'director', 'auditor', 'sst_technician']
  },
  {
    id: 'safety_executive',
    label: 'Executive SST',
    path: '/app/safety/operational?view=executive',
    requires: { executive: true },
    bands: ['director']
  },
  {
    id: 'safety_widgets_only',
    label: 'SST (contexto)',
    path: '/app/safety/operational',
    requires: { operational: true },
    bands: ['production']
  }
]);

export function listManifestRoutesForTests() {
  return SAFETY_NAVIGATION_MANIFEST.map((m) => m.path);
}
