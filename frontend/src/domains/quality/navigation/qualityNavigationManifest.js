/**
 * Manifesto declarativo de itens navegáveis QUALITY (paths canónicos via rota WAVE6 existente).
 * Rotas segmentadas /app/quality/* fora de operational exigiriam App.jsx — usamos query `view`.
 */

/** @typedef {{ id: string, label: string, path: string, requires: { governance?: boolean, executive?: boolean, operational?: boolean }, bands: import('./qualityAudienceNavigation.js').QualityAudienceBand[] }} QualityNavManifestItem */

/** @type {QualityNavManifestItem[]} */
export const QUALITY_NAVIGATION_MANIFEST = Object.freeze([
  {
    id: 'quality_operational',
    label: 'Quality — Operacional',
    path: '/app/quality/operational',
    requires: { operational: true },
    bands: ['operator', 'coordinator', 'director', 'auditor']
  },
  {
    id: 'quality_inspections',
    label: 'Inspeções',
    path: '/app/quality/operational/inspection',
    requires: { operational: true },
    bands: ['operator', 'coordinator', 'director']
  },
  {
    id: 'quality_ncr_workspace',
    label: 'NCR & CAPA (workspace)',
    path: '/app/quality/operational?view=ncr',
    requires: { governance: true },
    bands: ['operator', 'coordinator']
  },
  {
    id: 'quality_spc_governance',
    label: 'SPC / Governança',
    path: '/app/quality/operational?view=governance',
    requires: { governance: true },
    bands: ['coordinator', 'director', 'auditor']
  },
  {
    id: 'quality_supplier',
    label: 'Fornecedores & qualidade',
    path: '/app/quality/operational?view=governance',
    requires: { governance: true },
    bands: ['coordinator', 'director']
  },
  {
    id: 'quality_telemetry',
    label: 'Telemetria industrial',
    path: '/app/quality/operational?view=telemetry',
    requires: { governance: true },
    bands: ['coordinator', 'director', 'auditor']
  },
  {
    id: 'quality_cognitive',
    label: 'Inteligência contextual',
    path: '/app/quality/operational?view=cognitive',
    requires: { executive: true },
    bands: ['coordinator', 'director']
  },
  {
    id: 'quality_rollout',
    label: 'Rollout enterprise',
    path: '/app/quality/operational?view=rollout',
    requires: { executive: true },
    bands: ['director', 'auditor']
  },
  {
    id: 'quality_executive',
    label: 'Executive Quality',
    path: '/app/quality/operational?view=cognitive',
    requires: { executive: true },
    bands: ['director']
  },
  {
    id: 'quality_widgets_only',
    label: 'Qualidade (contexto)',
    path: '/app/quality/operational',
    requires: { operational: true },
    bands: ['production']
  }
]);

export function listManifestRoutesForTests() {
  return QUALITY_NAVIGATION_MANIFEST.map((m) => m.path);
}
