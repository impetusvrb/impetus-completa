/**
 * ENT-001 — Inventário operacional consolidado (OPM + WMS + contratos).
 */
import { WMS_ENTERPRISE_BASELINE } from '../cognitive/registry/cognitivePlatformRegistry.js';
import { LOGISTICS_MODULE_PHASES } from '../../presentation/eox/eoxRegistry.js';
import { WMS_OPERATIONAL_MODULES } from '../../domains/logistics-operational/routes/wmsModuleRegistry.js';
import { ENT_001_PHASE } from './ent001Constants.js';

export const ENT_OPERATIONAL_PHASES = Object.freeze([
  Object.freeze({ phase: 'OPM-001D', label: 'Industrial Module Foundation', status: 'certified' }),
  Object.freeze({ phase: 'OPM-002A', label: 'Inventory Foundation', status: 'certified' }),
  Object.freeze({ phase: 'OPM-003', label: 'Receiving Operations', status: 'certified' }),
  Object.freeze({ phase: 'OPM-004', label: 'Picking Operations', status: 'certified' }),
  Object.freeze({ phase: 'OPM-005', label: 'Shipping Operations', status: 'certified' }),
  Object.freeze({ phase: 'OPM-006', label: 'Transfer Management', status: 'certified' }),
  Object.freeze({ phase: 'OPM-007', label: 'Warehouse Intelligence', status: 'certified' }),
  Object.freeze({ phase: 'OPM-008', label: 'Cognitive Logistics', status: 'certified' }),
  Object.freeze({ phase: 'OPM-E2E-001', label: 'End-to-End Certification', status: 'certified' }),
  Object.freeze({ phase: 'OPM-GOV-001', label: 'Operational Governance', status: 'certified' }),
  Object.freeze({ phase: 'WMS-REF-001', label: 'WMS Reference Components', status: 'certified' })
]);

export const ENT_OPERATIONAL_CONTRACTS = Object.freeze([
  Object.freeze({
    contractId: 'movement_lifecycle',
    label: 'Movement Lifecycle Contract',
    domain: 'logistics_wms',
    source: 'OPM-GOV-001',
    status: 'certified'
  }),
  Object.freeze({
    contractId: 'handoff_baseline',
    label: 'Operational Handoff Baseline',
    domain: 'logistics_wms',
    source: 'OPM-GOV-001',
    status: 'certified'
  }),
  Object.freeze({
    contractId: 'data_consumption_wi',
    label: 'Warehouse Intelligence Data Consumption',
    domain: 'logistics_wms',
    source: 'OPM-007',
    status: 'certified'
  }),
  Object.freeze({
    contractId: 'integration_receiving',
    label: 'Receiving Integration Contracts',
    domain: 'logistics_wms',
    source: 'OPM-003',
    status: 'certified'
  }),
  Object.freeze({
    contractId: 'integration_picking',
    label: 'Picking Integration Contracts',
    domain: 'logistics_wms',
    source: 'OPM-004',
    status: 'certified'
  }),
  Object.freeze({
    contractId: 'integration_shipping',
    label: 'Shipping Integration Contracts',
    domain: 'logistics_wms',
    source: 'OPM-005',
    status: 'certified'
  })
]);

export function buildOperationalCatalog() {
  const wmsModules = WMS_OPERATIONAL_MODULES.map((m) =>
    Object.freeze({
      moduleId: m.id,
      label: m.label,
      opmPhase: LOGISTICS_MODULE_PHASES[m.id] || 'WMS-007A',
      api: m.api,
      certified: WMS_ENTERPRISE_BASELINE.frozen === true
    })
  );

  return Object.freeze({
    baseline: WMS_ENTERPRISE_BASELINE,
    phases: ENT_OPERATIONAL_PHASES,
    contracts: ENT_OPERATIONAL_CONTRACTS,
    wmsModules,
    evidencePath: 'frontend/docs/evidence/OPM-*.md',
    frozen: WMS_ENTERPRISE_BASELINE.frozen
  });
}

export const ENT_OPERATIONAL_CATALOG = buildOperationalCatalog();

export function validateOperationalCatalog() {
  const issues = [];
  if (!ENT_OPERATIONAL_CATALOG.frozen) issues.push('WMS baseline not marked frozen');
  if (ENT_OPERATIONAL_CATALOG.phases.length < 10) issues.push('incomplete OPM phase list');
  if (ENT_OPERATIONAL_CATALOG.wmsModules.length < 7) issues.push('incomplete WMS module list');
  return {
    valid: issues.length === 0,
    issues,
    phase: ENT_001_PHASE,
    phaseCount: ENT_OPERATIONAL_CATALOG.phases.length,
    contractCount: ENT_OPERATIONAL_CATALOG.contracts.length
  };
}
