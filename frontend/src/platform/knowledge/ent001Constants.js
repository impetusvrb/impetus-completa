/**
 * ENT-001 — Enterprise Platform Knowledge Baseline (constantes).
 * Consolidação read-only — não altera domínios certificados.
 */
export const ENT_001_PHASE = 'ENT-001';
export const ENT_001_VERSION = '1.0.0';
export const ENT_001_PRINCIPLE = 'CONSOLIDATE BEFORE EVOLVE';
export const ENT_001_GENERATED_AT = '2026-07-20';

/** Classificação corporativa de maturidade */
export const ENT_MATURITY_LEVELS = Object.freeze([
  'certified',
  'mature',
  'in_evolution',
  'partial',
  'discovered',
  'experimental',
  'not_started'
]);

/** Programas fonte — artefactos já produzidos (reutilizar, não re-auditar) */
export const ENT_SOURCE_PROGRAMS = Object.freeze([
  Object.freeze({ id: 'BASELINE-SYSTEM', type: 'architecture', status: 'certified' }),
  Object.freeze({ id: 'ARC-001', type: 'architecture', status: 'certified' }),
  Object.freeze({ id: 'ARC-003A', type: 'architecture', status: 'certified' }),
  Object.freeze({ id: 'NAV-001', type: 'navigation', status: 'certified' }),
  Object.freeze({ id: 'NAV-002A', type: 'navigation', status: 'certified' }),
  Object.freeze({ id: 'EOX', type: 'presentation', status: 'certified' }),
  Object.freeze({ id: 'WMS-REF-001', type: 'operational', status: 'certified' }),
  Object.freeze({ id: 'OPM-001D', type: 'operational', status: 'certified' }),
  Object.freeze({ id: 'OPM-002A', type: 'operational', status: 'certified' }),
  Object.freeze({ id: 'OPM-003', type: 'operational', status: 'certified' }),
  Object.freeze({ id: 'OPM-004', type: 'operational', status: 'certified' }),
  Object.freeze({ id: 'OPM-005', type: 'operational', status: 'certified' }),
  Object.freeze({ id: 'OPM-006', type: 'operational', status: 'certified' }),
  Object.freeze({ id: 'OPM-007', type: 'operational', status: 'certified' }),
  Object.freeze({ id: 'OPM-008', type: 'operational', status: 'certified' }),
  Object.freeze({ id: 'OPM-E2E-001', type: 'operational', status: 'certified' }),
  Object.freeze({ id: 'OPM-GOV-001', type: 'operational', status: 'certified' }),
  Object.freeze({ id: 'CPL-001', type: 'cognitive', status: 'certified' }),
  Object.freeze({ id: 'CPL-002', type: 'cognitive', status: 'certified' }),
  Object.freeze({ id: 'CPL-003', type: 'cognitive', status: 'certified' }),
  Object.freeze({ id: 'FIN-AUD-001', type: 'audit', status: 'complete' }),
  Object.freeze({ id: 'REG-001', type: 'audit', status: 'complete' }),
  Object.freeze({ id: 'REG-002', type: 'recovery', status: 'complete' })
]);
