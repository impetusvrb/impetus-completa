'use strict';

/**
 * Prioridade semântica oficial (Fase C).
 * Ordem numérica menor = maior prioridade.
 */
const SEMANTIC_PRIORITY = Object.freeze([
  { step: 'functional_area_explicit', priority: 1, description: 'Área funcional explícita (manual)' },
  { step: 'department', priority: 2, description: 'Departamento cadastrado' },
  { step: 'structural_role', priority: 3, description: 'Cargo formal (Base Estrutural)' },
  { step: 'structural_profile_hint', priority: 4, description: 'Perfil / hint do cargo estrutural' },
  { step: 'organizational_hierarchy', priority: 5, description: 'Hierarquia organizacional' },
  { step: 'textual_description', priority: 6, description: 'Descrição textual do papel' },
  { step: 'multi_signal_context', priority: 7, description: 'Contexto multi-sinal (interpreter)' },
  { step: 'contextual_history', priority: 8, description: 'Histórico contextual (reservado)' },
  { step: 'tenant_override', priority: 9, description: 'Tenant overrides' },
  { step: 'automatic_heuristic', priority: 10, description: 'Heurística automática (fallback)' }
]);

const FORBIDDEN_INFERENCE_PATTERNS = Object.freeze([
  { pattern: /coordenador/i, force_axis: 'quality', reason: 'coordenador_must_not_force_quality' },
  { pattern: /gerente/i, force_axis: 'operations', reason: 'gerente_must_not_force_operations_blind' },
  { pattern: /supervisor/i, force_axis: 'production', reason: 'supervisor_must_not_force_production_blind' },
  { pattern: /governanca/i, force_axis: 'quality', reason: 'governance_must_not_force_quality' }
]);

function getStepPriority(step) {
  const found = SEMANTIC_PRIORITY.find((p) => p.step === step);
  return found ? found.priority : 99;
}

function isForbiddenInference(source, axis) {
  for (const rule of FORBIDDEN_INFERENCE_PATTERNS) {
    if (source === 'role_default' && axis === rule.force_axis) return rule.reason;
  }
  return null;
}

module.exports = {
  SEMANTIC_PRIORITY,
  FORBIDDEN_INFERENCE_PATTERNS,
  getStepPriority,
  isForbiddenInference
};
