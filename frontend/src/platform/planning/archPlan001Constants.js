/**
 * ARCH-PLAN-001 — Enterprise Evolution Planning (constantes).
 * Planeamento read-only derivado exclusivamente de ENT-001.
 */
export const ARCH_PLAN_001_PHASE = 'ARCH-PLAN-001';
export const ARCH_PLAN_001_VERSION = '1.0.0';
export const ARCH_PLAN_001_PRINCIPLE = 'PLAN BEFORE BUILD';
export const ARCH_PLAN_001_GENERATED_AT = '2026-07-20';
export const ARCH_PLAN_001_BASELINE = 'ENT-001';

/** Estratégias de evolução permitidas */
export const EVOLUTION_STRATEGIES = Object.freeze([
  'integrate_then_develop',
  'recover_then_expand',
  'greenfield',
  'maintenance_only'
]);

/** Programas congelados — não reabrir */
export const FROZEN_PROGRAMS = Object.freeze([
  'BASELINE',
  'ARC',
  'GF',
  'NAV',
  'EOX',
  'WMS-REF',
  'OPM',
  'OPM-GOV',
  'OPM-E2E',
  'CPL',
  'FIN-AUD',
  'REG',
  'ENT-001'
]);
