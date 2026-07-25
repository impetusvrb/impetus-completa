/**
 * FIN-CERT-001 — Finance Domain Certification.
 * Certification/validation only: no product capability or contract mutation.
 */
export const FIN_CERT_001_PHASE = 'FIN-CERT-001';
export const FIN_CERT_001_PRINCIPLE = 'CERTIFY THE DOMAIN, NOT THE RELEASE';

export const FIN_CERT_001_SCOPE = Object.freeze({
  certificationOnly: true,
  documentationAndValidationOnly: true,
  implementsFeatures: false,
  altersBusinessLogic: false,
  altersContracts: false,
  createsProductComponents: false,
  opensHorizontalRoadmap: false
});

export const FIN_CERT_001_COMPLETED_PROGRAMS = Object.freeze([
  'FIN-AUD-001',
  'FIN-EVOLVE-001',
  'FIN-EVOLVE-001A',
  'FIN-STAB-001',
  'FIN-EVOLVE-002',
  'FIN-DATA-001',
  'FIN-READY-001',
  'FIN-EVOLVE-2.1',
  'FIN-TWIN-READY-001',
  'FIN-EVOLVE-2.2',
  'FIN-VAL-001',
  'FIN-EVOLVE-2.3',
  'FIN-PRED-READY-001',
  'PRED-BASE-001',
  'PRED-BASE-002',
  'FIN-EVOLVE-2.4'
]);

export const FIN_CERT_STATUS = Object.freeze({
  CERTIFIED: 'CERTIFIED',
  HOLD: 'HOLD'
});

