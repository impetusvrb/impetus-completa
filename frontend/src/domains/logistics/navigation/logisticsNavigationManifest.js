/**
 * Manifesto LOGISTICS — WMS/TMS enterprise (rotas canónicas /app/logistics/operational).
 */

/** @type {Array<{ id: string, label: string, path: string, requires: object, bands: string[] }>} */
export const LOGISTICS_NAVIGATION_MANIFEST = Object.freeze([
  {
    id: 'logistics_operational',
    label: 'Logística — Operacional',
    path: '/app/logistics/operational',
    requires: { operational: true },
    bands: ['operator', 'technician', 'supervisor', 'coordinator', 'manager', 'director', 'auditor']
  },
  {
    id: 'logistics_receiving',
    label: 'Recebimento & doca',
    path: '/app/logistics/operational?view=receiving',
    requires: { operational: true },
    bands: ['operator', 'technician', 'supervisor']
  },
  {
    id: 'logistics_storage',
    label: 'Armazenagem & LPN',
    path: '/app/logistics/operational?view=storage',
    requires: { operational: true },
    bands: ['operator', 'technician', 'supervisor', 'coordinator']
  },
  {
    id: 'logistics_picking',
    label: 'Picking & separação',
    path: '/app/logistics/operational?view=picking',
    requires: { operational: true },
    bands: ['operator', 'technician', 'supervisor']
  },
  {
    id: 'logistics_shipping',
    label: 'Expedição & OTIF',
    path: '/app/logistics/operational?view=shipping',
    requires: { operational: true },
    bands: ['operator', 'technician', 'supervisor', 'coordinator']
  },
  {
    id: 'logistics_dock',
    label: 'Docas & staging',
    path: '/app/logistics/operational?view=dock',
    requires: { governance: true },
    bands: ['supervisor', 'coordinator', 'manager']
  },
  {
    id: 'logistics_telemetry',
    label: 'Telemetria logística',
    path: '/app/logistics/operational?view=telemetry',
    requires: { governance: true },
    bands: ['coordinator', 'manager', 'director', 'auditor']
  },
  {
    id: 'logistics_governance',
    label: 'Governança supply chain',
    path: '/app/logistics/operational?view=governance',
    requires: { governance: true },
    bands: ['coordinator', 'manager', 'director', 'auditor']
  },
  {
    id: 'logistics_rollout',
    label: 'Rollout enterprise logística',
    path: '/app/logistics/operational?view=rollout',
    requires: { executive: true },
    bands: ['director', 'auditor']
  },
  {
    id: 'logistics_maturity',
    label: 'Maturidade operacional',
    path: '/app/logistics/operational?view=maturity',
    requires: { executive: true },
    bands: ['manager', 'director', 'auditor']
  },
  {
    id: 'logistics_widgets_only',
    label: 'Logística (contexto)',
    path: '/app/logistics/operational',
    requires: { operational: true },
    bands: ['production']
  }
]);

export function listLogisticsManifestRoutesForTests() {
  return LOGISTICS_NAVIGATION_MANIFEST.map((m) => m.path);
}
