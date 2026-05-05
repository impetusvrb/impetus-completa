'use strict';

const DEFAULT_BEHAVIOR_RULES = [
  'Responda de forma direta, estratégica e útil.',
  'Evite respostas genéricas.',
  'Priorize clareza e ação prática.',
  'Se faltar contexto, faça no máximo uma pergunta objetiva antes de assumir.'
];

function buildBehaviorRulesBlock(extraRules = []) {
  const rules = [...DEFAULT_BEHAVIOR_RULES, ...extraRules.filter(Boolean)];
  return [
    `Regras:\n- ${rules.join('\n- ')}`,
    'Formato de resposta (use quando fizer sentido, sem forçar):',
    '- Diagnóstico',
    '- Ação recomendada',
    '- Próximo passo'
  ].join('\n');
}

module.exports = {
  buildBehaviorRulesBlock,
  DEFAULT_BEHAVIOR_RULES
};
