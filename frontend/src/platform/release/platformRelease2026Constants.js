/**
 * PLATFORM-2026.1 — Enterprise Baseline Release (constantes).
 * Formalização read-only — consome ENT-001 + ARCH-PLAN-001 exclusivamente.
 */
export const PLATFORM_RELEASE_ID = 'PLATFORM-2026.1';
export const PLATFORM_RELEASE_VERSION = '2026.1.0';
export const PLATFORM_RELEASE_PRINCIPLE = 'FREEZE BEFORE EVOLVE';
export const PLATFORM_RELEASE_DATE = '2026-07-20';
export const PLATFORM_RELEASE_STATUS = 'CERTIFIED';

/** Fluxo obrigatório pós-release */
export const PLATFORM_EVOLUTION_PIPELINE = Object.freeze([
  'Build Platform',
  'Stabilize',
  'Audit',
  'Recover',
  'Consolidate',
  'Plan',
  'Freeze Baseline',
  'Only Then',
  'Evolve Domains'
]);

/** Convenção de novos programas — padrão vertical por domínio */
export const PROGRAM_NAMING_CONVENTION = Object.freeze({
  pattern: '<DOMAIN>-EVOLVE-<NNN>',
  examples: Object.freeze([
    'FIN-EVOLVE-001',
    'SUP-EVOLVE-001',
    'PPAP-EVOLVE-001',
    'MSA-EVOLVE-001',
    'ISH-EVOLVE-001'
  ]),
  forbiddenHorizontalExamples: Object.freeze([
    'ARC-004',
    'CPL-004',
    'OPM-009',
    'REG-003',
    'ENT-002'
  ])
});

/** Estado congelado dos programas estruturantes */
export const PROGRAM_FREEZE_STATE = Object.freeze({
  status: 'CERTIFIED',
  mode: 'FROZEN',
  evolution: 'MAINTENANCE ONLY'
});
