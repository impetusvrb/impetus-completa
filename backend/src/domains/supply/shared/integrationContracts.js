'use strict';

/**
 * GF-023 — Integrações declarativas + fluxo procure-to-pay → WMS (conceptual).
 */

const PROCURE_TO_PAY_WMS_FLOW = Object.freeze([
  { step: 1, supply: 'PurchaseOrder', handoff: 'event', target: 'WMS', wms: 'ReceivingOrder', mode: 'future_contract' },
  { step: 2, supply: null, handoff: 'operational', target: 'WMS', wms: 'Receiving', mode: 'execution' },
  { step: 3, supply: null, handoff: 'operational', target: 'WMS', wms: 'Inventory', mode: 'execution' },
  { step: 4, supply: null, handoff: 'operational', target: 'WMS', wms: 'Warehouse', mode: 'execution' }
]);

module.exports = Object.freeze({
  executive: {
    id: 'executive',
    mode: 'read',
    events: ['executive.rollup.read'],
    active: false,
    phase: 'GF-025'
  },
  logistics_wms: {
    id: 'logistics_operational',
    mode: 'read',
    via: 'OCL',
    active: false,
    phase: 'GF-024',
    note: 'GF-023: zero imports — fluxo conceptual PROCURE_TO_PAY_WMS_FLOW',
    conceptual_flow: PROCURE_TO_PAY_WMS_FLOW
  },
  logistics_cognitive: {
    id: 'logistics_native',
    mode: 'read',
    active: false,
    phase: 'GF-024',
    locked: true
  },
  ppap: { id: 'ppap_native', mode: 'read', active: false, phase: 'GF-024' },
  msa: { id: 'msa_native', mode: 'read', active: false, phase: 'GF-024' },
  ishikawa: { id: 'ishikawa_native', mode: 'read', active: false, phase: 'GF-024' },
  erp: { id: 'erp', mode: 'read', active: false, phase: 'GF-024' },
  PROCURE_TO_PAY_WMS_FLOW
});
