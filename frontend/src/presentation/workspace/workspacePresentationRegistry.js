/**
 * UX-001 — Workspace Presentation Registry (estrutura visual partilhada).
 * Documentação declarativa — sem alterar runtime de domínio.
 */

export const WORKSPACE_PRESENTATION_PATTERN = Object.freeze({
  id: 'UX-001-workspace-shell',
  shell: 'foundation-shell + internal-nav + module-panel',
  domains: Object.freeze([
    {
      domainId: 'logistics_wms',
      workspacePath: '/app/logistics-operational/workspace',
      internalNav: 'WmsOperationalNav',
      modules: ['dashboard', 'warehouses', 'inventory', 'receiving', 'picking', 'shipping', 'transfers']
    },
    {
      domainId: 'supply',
      workspacePath: '/app/supply/workspace',
      internalNav: 'SupplyFoundationShell',
      modules: ['suppliers', 'purchase-requests', 'purchase-orders', 'contracts']
    },
    {
      domainId: 'quality',
      workspacePath: '/app/quality/operational',
      pattern: 'quality-publication-manifest'
    },
    {
      domainId: 'safety',
      workspacePath: '/app/safety/operational',
      pattern: 'safety-publication-manifest'
    },
    {
      domainId: 'environment',
      workspacePath: '/app/environment/operational',
      pattern: 'environment-publication-manifest'
    }
  ])
});

export function getWorkspacePresentationSnapshot() {
  return Object.freeze({ ...WORKSPACE_PRESENTATION_PATTERN });
}
