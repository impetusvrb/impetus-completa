'use strict';

/**
 * INC-048 — Contratos de convergência (referências — sem alterar SSOT dos domínios).
 */

const INC048_CONTRACT_VERSION = '1.0.0';

const CONVERGENCE_FLOW = Object.freeze([
  'SUPPLY_WORKSPACE',
  'SUPPLY_RUNTIME',
  'PROMOTION_RUNTIME',
  'PILOT_INTEGRATION_LAYER',
  'CANONICAL_CONTRACTS',
  'WMS_PUBLIC_APIS',
  'LOGISTICS_RUNTIME',
  'WMS_OPERATIONAL_WORKSPACE'
]);

const OFFICIAL_BOUNDARIES = Object.freeze({
  supply_to_logistics: 'PILOT_INTEGRATION_LAYER → CANONICAL_CONTRACTS → WMS_PUBLIC_APIS',
  forbidden: ['DIRECT_DOMAIN_IMPORT', 'OCL_BYPASS', 'INTERNAL_REPO_ACCESS']
});

const REFERENCED_VERSIONS = Object.freeze({
  supply_canonical: '0.2.0',
  pilot_bridge: '0.3.0',
  wms_api: 'WMS-003-v1',
  wms_workspace: 'WMS-004',
  supply_homologation: 'GF-027'
});

module.exports = {
  INC048_CONTRACT_VERSION,
  CONVERGENCE_FLOW,
  OFFICIAL_BOUNDARIES,
  REFERENCED_VERSIONS
};
