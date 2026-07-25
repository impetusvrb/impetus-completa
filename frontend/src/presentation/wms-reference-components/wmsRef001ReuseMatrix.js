/**
 * WMS-REF-001 — Matriz de reutilização obrigatória (OPM-003 → OPM-007).
 */
import { WMS_REF001_CERTIFIED_COMPONENT_IDS } from './wmsRef001ComponentContracts.js';

export const WMS_REF001_REUSE_POLICY = Object.freeze({
  phase: 'WMS-REF-001',
  mandatory: true,
  exceptionProcess:
    'Criação de componente equivalente requer justificativa arquitectural documentada em ADR ou gap registry do módulo.',
  officialImportPath: 'presentation/wms-reference-components'
});

/** Módulos WMS que devem reutilizar Reference Components */
export const WMS_REF001_SUCCESSOR_MODULES = Object.freeze([
  { moduleId: 'receiving', phase: 'OPM-003', label: 'Receiving Operations' },
  { moduleId: 'picking', phase: 'OPM-004', label: 'Picking Operations & Order Fulfillment' },
  { moduleId: 'shipping', phase: 'OPM-005', label: 'Shipping Control & Outbound Logistics' },
  { moduleId: 'transfers', phase: 'OPM-006', label: 'Transfer Management & Internal Logistics' },
  { moduleId: 'warehouse_intelligence', phase: 'OPM-007', label: 'Warehouse Intelligence & Operational Optimization' },
  { moduleId: 'cognitive_logistics', phase: 'OPM-008', label: 'Cognitive Logistics & Decision Intelligence' }
]);

/**
 * Matriz módulo × componente.
 * required = deve importar do catálogo certificado
 * adapt = reutilizar com extensão documentada (colunas, filtros, intelligence)
 */
export const WMS_REF001_REUSE_MATRIX = Object.freeze(
  WMS_REF001_SUCCESSOR_MODULES.map((mod) =>
    Object.freeze({
      ...mod,
      components: Object.freeze(
        WMS_REF001_CERTIFIED_COMPONENT_IDS.reduce((acc, componentId) => {
          acc[componentId] = Object.freeze({
            reuse: 'required',
            mode: componentId === 'InventoryMetrics' || componentId === 'InventoryGrid' ? 'adapt' : 'direct',
            notes:
              componentId === 'InventoryGrid' || componentId === 'InventoryMetrics'
                ? 'Adaptar colunas/intelligence; manter componente base'
                : 'Import directo do catálogo certificado'
          });
          return acc;
        }, {})
      )
    })
  )
);

export function getReuseRequirement(moduleId, componentId) {
  const row = WMS_REF001_REUSE_MATRIX.find((m) => m.moduleId === moduleId);
  return row?.components?.[componentId] ?? null;
}
