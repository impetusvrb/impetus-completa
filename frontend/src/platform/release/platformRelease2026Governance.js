/**
 * PLATFORM-2026.1 — Governança de release (programas congelados + regras evolução).
 */
import { EVOLUTION_STRATEGIES } from '../planning/archPlan001Constants.js';
import {
  PLATFORM_RELEASE_ID,
  PLATFORM_RELEASE_PRINCIPLE,
  PROGRAM_FREEZE_STATE,
  PROGRAM_NAMING_CONVENTION
} from './platformRelease2026Constants.js';

/** Programas oficialmente congelados nesta release */
export const PLATFORM_FROZEN_PROGRAMS = Object.freeze([
  Object.freeze({ program: 'BASELINE', family: 'foundation', ...PROGRAM_FREEZE_STATE }),
  Object.freeze({ program: 'ARC', family: 'foundation', ...PROGRAM_FREEZE_STATE }),
  Object.freeze({ program: 'GF', family: 'foundation', ...PROGRAM_FREEZE_STATE }),
  Object.freeze({ program: 'NAV', family: 'foundation', ...PROGRAM_FREEZE_STATE }),
  Object.freeze({ program: 'EOX', family: 'foundation', ...PROGRAM_FREEZE_STATE }),
  Object.freeze({ program: 'WMS-REF', family: 'operational', ...PROGRAM_FREEZE_STATE }),
  Object.freeze({ program: 'OPM', family: 'operational', ...PROGRAM_FREEZE_STATE }),
  Object.freeze({ program: 'OPM-GOV', family: 'operational', ...PROGRAM_FREEZE_STATE }),
  Object.freeze({ program: 'OPM-E2E', family: 'operational', ...PROGRAM_FREEZE_STATE }),
  Object.freeze({ program: 'CPL', family: 'cognitive', ...PROGRAM_FREEZE_STATE }),
  Object.freeze({ program: 'FIN-AUD', family: 'audit', ...PROGRAM_FREEZE_STATE }),
  Object.freeze({ program: 'REG', family: 'recovery', ...PROGRAM_FREEZE_STATE }),
  Object.freeze({ program: 'ENT', family: 'knowledge', ...PROGRAM_FREEZE_STATE }),
  Object.freeze({ program: 'ARCH-PLAN', family: 'planning', ...PROGRAM_FREEZE_STATE })
]);

/** Alterações permitidas em programas congelados */
export const FROZEN_PROGRAM_ALLOWED_CHANGES = Object.freeze([
  'critical_bugfix',
  'security_patch',
  'mandatory_compatibility'
]);

/** Regras formais de evolução por domínio */
export const PLATFORM_EVOLUTION_RULES = Object.freeze([
  Object.freeze({
    ruleId: 'reuse_existing_infra',
    label: 'Reutilizar infraestrutura existente',
    mandatory: true,
    source: 'ENT-001 + ARCH-PLAN-001'
  }),
  Object.freeze({
    ruleId: 'use_eox',
    label: 'Utilizar EOX para apresentação operacional',
    mandatory: true,
    source: 'EOX certified'
  }),
  Object.freeze({
    ruleId: 'use_existing_registries',
    label: 'Utilizar registries existentes — não criar paralelos',
    mandatory: true,
    source: 'CPL-003 governance'
  }),
  Object.freeze({
    ruleId: 'respect_certified_contracts',
    label: 'Respeitar contratos certificados congelados',
    mandatory: true,
    source: 'OPM-GOV-001 + CPL-001'
  }),
  Object.freeze({
    ruleId: 'cpl_adapters_only',
    label: 'CPL apenas por adapters — sem novos engines horizontais',
    mandatory: true,
    source: 'CPL-002 certified'
  }),
  Object.freeze({
    ruleId: 'follow_arch_plan_strategy',
    label: 'Seguir estratégia definida pelo ARCH-PLAN-001',
    mandatory: true,
    source: 'ARCH-PLAN-001'
  }),
  Object.freeze({
    ruleId: 'no_parallel_infrastructure',
    label: 'Proibido criar infraestrutura paralela',
    mandatory: true,
    source: 'architectural-security-protocol'
  }),
  Object.freeze({
    ruleId: 'declare_evolution_strategy',
    label: 'Todo novo programa deve declarar estratégia explicitamente',
    mandatory: true,
    source: 'PLATFORM-2026.1'
  })
]);

/** Estratégias oficiais registradas */
export const PLATFORM_EVOLUTION_STRATEGIES = Object.freeze(
  EVOLUTION_STRATEGIES.map((strategy) => {
    const objectives = {
      maintenance_only: 'Apenas manutenção — preservar baseline certificada',
      integrate_then_develop: 'Integrar capacidades existentes antes de GREENFIELD scoped',
      recover_then_expand: 'Recuperar ligações desconectadas antes de expandir',
      greenfield: 'Iniciar domínio novo confirmado na baseline'
    };
    return Object.freeze({
      strategy,
      objective: objectives[strategy] || strategy,
      declaredInProgram: true
    });
  })
);

/** Critérios para mudanças em programas congelados */
export const STRUCTURAL_CHANGE_CRITERIA = Object.freeze([
  Object.freeze({
    criterionId: 'technical_justification',
    label: 'Justificativa técnica documentada',
    required: true
  }),
  Object.freeze({
    criterionId: 'impact_analysis',
    label: 'Análise de impacto cross-domain',
    required: true
  }),
  Object.freeze({
    criterionId: 'architectural_approval',
    label: 'Aprovação arquitetural formal',
    required: true
  }),
  Object.freeze({
    criterionId: 'rollback_plan',
    label: 'Plano de rollback',
    required: true
  }),
  Object.freeze({
    criterionId: 're_certification',
    label: 'Nova certificação do programa afectado',
    required: true
  })
]);

export const PLATFORM_GOVERNANCE = Object.freeze({
  releaseId: PLATFORM_RELEASE_ID,
  principle: PLATFORM_RELEASE_PRINCIPLE,
  frozenPrograms: PLATFORM_FROZEN_PROGRAMS,
  allowedChangesOnFrozen: FROZEN_PROGRAM_ALLOWED_CHANGES,
  evolutionRules: PLATFORM_EVOLUTION_RULES,
  evolutionStrategies: PLATFORM_EVOLUTION_STRATEGIES,
  programNamingConvention: PROGRAM_NAMING_CONVENTION,
  structuralChangeCriteria: STRUCTURAL_CHANGE_CRITERIA,
  horizontalProgramsForbidden: true,
  extraordinaryDecisionRequired: PROGRAM_NAMING_CONVENTION.forbiddenHorizontalExamples
});

export function getPlatformGovernance() {
  return PLATFORM_GOVERNANCE;
}

export function isProgramFrozen(programFamily) {
  const key = String(programFamily || '').toUpperCase();
  return PLATFORM_FROZEN_PROGRAMS.some(
    (p) => p.program === key || p.program.startsWith(key)
  );
}

export function validatePlatformGovernance() {
  const issues = [];
  if (PLATFORM_FROZEN_PROGRAMS.length < 14) {
    issues.push('incomplete frozen program registry');
  }
  if (PLATFORM_EVOLUTION_RULES.length < 6) issues.push('incomplete evolution rules');
  if (!PLATFORM_FROZEN_PROGRAMS.find((p) => p.program === 'ARCH-PLAN')) {
    issues.push('ARCH-PLAN must be frozen');
  }
  if (!PLATFORM_FROZEN_PROGRAMS.find((p) => p.program === 'ENT')) {
    issues.push('ENT must be frozen');
  }
  return {
    valid: issues.length === 0,
    issues,
    releaseId: PLATFORM_RELEASE_ID,
    frozenCount: PLATFORM_FROZEN_PROGRAMS.length,
    ruleCount: PLATFORM_EVOLUTION_RULES.length
  };
}
