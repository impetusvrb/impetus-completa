'use strict';

/**
 * Ergonomia cognitiva industrial.
 *
 * Determina o formato óptimo de resposta baseado em:
 *  - perfil do utilizador (operador, supervisor, gestor, executivo)
 *  - criticidade e urgência
 *  - saturação operacional (não sobrecarregar operador sob pressão)
 *  - hora / turno (madrugada → respostas mais curtas)
 *
 * Resultado: um descriptor de como a resposta deve ser formatada.
 * Nunca gera o conteúdo — apenas orienta a camada de linguagem.
 */

const PROFILE_DEFAULTS = Object.freeze({
  operador: { max_actions: 2, verbosity: 'compact', show_rationale: false },
  supervisor: { max_actions: 4, verbosity: 'normal', show_rationale: true },
  gestor: { max_actions: 5, verbosity: 'normal', show_rationale: true },
  manager: { max_actions: 5, verbosity: 'normal', show_rationale: true },
  plant_manager: { max_actions: 6, verbosity: 'detailed', show_rationale: true },
  director: { max_actions: 3, verbosity: 'executive', show_rationale: false },
  executive: { max_actions: 3, verbosity: 'executive', show_rationale: false },
  admin: { max_actions: 6, verbosity: 'detailed', show_rationale: true },
  default: { max_actions: 3, verbosity: 'normal', show_rationale: false }
});

function computeErgonomics({
  profileCode = 'default',
  criticality = {},
  urgency = {},
  operational = {},
  temporal = {},
  calibration = {}
} = {}) {
  const base = PROFILE_DEFAULTS[String(profileCode || 'default').toLowerCase()] || PROFILE_DEFAULTS.default;

  // saturação: operador sobrecarregado → modo compacto
  const saturation = Number(operational?.operational_saturation || 0);
  const underPressure = saturation > 0.7;

  // turno de madrugada → respostas mais curtas
  const lateNight = ['madrugada', 'noite'].includes(temporal?.part_of_day);

  // criticidade alta → priorizar informação crítica, não verbosidade
  const critLevel = criticality?.level || 'low';
  const highCrit = ['critical', 'high'].includes(critLevel);

  let verbosity = base.verbosity;
  let max_actions = base.max_actions;
  let show_rationale = base.show_rationale;

  if (underPressure || lateNight) {
    verbosity = 'compact';
    max_actions = Math.min(max_actions, 2);
    show_rationale = false;
  }

  if (highCrit) {
    // alta criticidade: máx 1-2 acções críticas, linguagem directa
    max_actions = Math.min(max_actions, 3);
  }

  // qualidade calibrada baixa → menos enrichment
  if (calibration?.suppress_enrichment) {
    verbosity = 'compact';
    max_actions = 1;
    show_rationale = false;
  }

  const focus_order = [];
  if (highCrit) focus_order.push('critical_alert');
  if (urgency?.level === 'high') focus_order.push('urgency_signal');
  focus_order.push('primary_action');
  if (show_rationale) focus_order.push('rationale');
  if (verbosity !== 'compact') focus_order.push('context_summary');

  return {
    profile: profileCode,
    verbosity,
    max_actions,
    show_rationale,
    under_pressure: underPressure,
    late_night_mode: lateNight,
    high_criticality_mode: highCrit,
    focus_order,
    format_hint: verbosity === 'executive' ? 'bullet_3_max' : verbosity === 'compact' ? 'one_liner' : 'structured'
  };
}

module.exports = { computeErgonomics, PROFILE_DEFAULTS };
