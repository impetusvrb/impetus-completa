/**
 * WMS-REF-001 — Import oficial dos Reference Components certificados.
 *
 * Política: módulos OPM-003+ DEVEM importar deste path.
 * Implementação canónica: inventory/components/ (OPM-002A Reference Module).
 */
export {
  InventoryDashboard,
  InventoryMetrics,
  InventorySearch,
  InventoryFilters,
  InventoryGrid,
  InventoryTimeline,
  InventoryExport
} from '../../domains/logistics-operational/modules/inventory/components/index.js';

export {
  WMS_REF001_CERTIFICATION,
  WMS_REF001_CATALOG,
  WMS_REF001_COMPATIBILITY,
  WMS_REF001_PHASE,
  WMS_REF001_SOURCE_PHASE,
  WMS_REF001_COMPONENT_CONTRACTS,
  WMS_REF001_CERTIFIED_COMPONENT_IDS,
  WMS_REF001_CONTRACT_SCHEMA,
  WMS_REF001_REUSE_POLICY,
  WMS_REF001_REUSE_MATRIX,
  isWmsRef001Certified,
  getWmsRef001CatalogEntry
} from './wmsRef001Registry.js';

export {
  getWmsRef001Contract,
  assertWmsRef001ContractComplete
} from './wmsRef001ComponentContracts.js';

export { getReuseRequirement } from './wmsRef001ReuseMatrix.js';
