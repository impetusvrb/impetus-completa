/**
 * WMS-REF-001 — Reference Components Certification Registry.
 * Certifica biblioteca OPM-002A como património corporativo WMS.
 */
import {
  WMS_REF001_PHASE,
  WMS_REF001_SOURCE_PHASE,
  WMS_REF001_COMPONENT_CONTRACTS,
  WMS_REF001_CERTIFIED_COMPONENT_IDS,
  WMS_REF001_CONTRACT_SCHEMA
} from './wmsRef001ComponentContracts.js';
import { WMS_REF001_REUSE_POLICY, WMS_REF001_REUSE_MATRIX } from './wmsRef001ReuseMatrix.js';

export const WMS_REF001_CERTIFICATION = Object.freeze({
  id: 'WMS-REF-001',
  phase: WMS_REF001_PHASE,
  sourcePhase: WMS_REF001_SOURCE_PHASE,
  title: 'Reference Components Certification',
  certified: true,
  certifiedAt: '2026-07-19',
  prerequisite: 'OPM-002A',
  nextGate: 'OPM-003',
  officialImportPath: 'presentation/wms-reference-components',
  implementationPath: 'domains/logistics-operational/modules/inventory/components',
  componentCount: WMS_REF001_CERTIFIED_COMPONENT_IDS.length
});

/** Catálogo corporativo — componente certificado */
export const WMS_REF001_CATALOG = Object.freeze(
  WMS_REF001_CERTIFIED_COMPONENT_IDS.map((componentId) => {
    const contract = WMS_REF001_COMPONENT_CONTRACTS[componentId];
    return Object.freeze({
      componentId,
      contractId: contract.id,
      slot: contract.slot,
      file: `components/${componentId}.jsx`,
      certified: true,
      phase: WMS_REF001_PHASE,
      reuse: 'mandatory'
    });
  })
);

/** Compatibilidade certificada */
export const WMS_REF001_COMPATIBILITY = Object.freeze({
  eox: { status: 'certified', components: ['InventoryExport → EoxActionBar'] },
  industrialDataGrid: { status: 'certified', components: ['InventoryGrid → IndustrialDataGrid'] },
  wms003Apis: { status: 'certified', note: 'Dados via hook de domínio; componentes são presentation-only' },
  observability: {
    status: 'certified',
    events: ['INVENTORY_SEARCH', 'INVENTORY_FILTER', 'INVENTORY_GRID_SORT', 'INVENTORY_EXPORT', 'INVENTORY_TIMELINE', 'INVENTORY_VIEW_CHANGED']
  },
  rbac: { status: 'certified', note: 'Enforcement no módulo pai (canAccessWmsModule)' },
  featureFlags: { status: 'certified', note: 'Sem bypass; flags aplicadas na camada de rota/API' }
});

export {
  WMS_REF001_PHASE,
  WMS_REF001_SOURCE_PHASE,
  WMS_REF001_COMPONENT_CONTRACTS,
  WMS_REF001_CERTIFIED_COMPONENT_IDS,
  WMS_REF001_CONTRACT_SCHEMA,
  WMS_REF001_REUSE_POLICY,
  WMS_REF001_REUSE_MATRIX
};

export function isWmsRef001Certified(componentId) {
  return WMS_REF001_CERTIFIED_COMPONENT_IDS.includes(componentId);
}

export function getWmsRef001CatalogEntry(componentId) {
  return WMS_REF001_CATALOG.find((e) => e.componentId === componentId) ?? null;
}
