'use strict';

/**
 * GF-023 — Catálogo canónico supply.* (contratos + emissão domínio GF-023).
 */

module.exports = Object.freeze([
  { type: 'supply.request.created', critical: false, phase: 'GF-023', processing: true },
  { type: 'supply.request.approved', critical: false, phase: 'GF-023', processing: true },
  { type: 'supply.quotation.received', critical: false, phase: 'GF-023', processing: true },
  { type: 'supply.quotation.selected', critical: false, phase: 'GF-023', processing: true },
  { type: 'supply.purchase_order.created', critical: false, phase: 'GF-023', processing: false },
  { type: 'supply.contract.signed', critical: false, phase: 'GF-023', processing: true },
  { type: 'supply.contract.expired', critical: false, phase: 'GF-023', processing: true },
  { type: 'supply.order.approved', critical: false, phase: 'GF-022', processing: false },
  { type: 'supply.vendor.selected', critical: false, phase: 'GF-022', processing: false },
  { type: 'supply.contract.updated', critical: false, phase: 'GF-022', processing: false },
  { type: 'supply.signal.received', critical: false, phase: 'GF-024', processing: false },
  { type: 'supply.case.opened', critical: false, phase: 'GF-023', processing: false },
  { type: 'supply.case.resolved', critical: false, phase: 'GF-023', processing: false }
]);
