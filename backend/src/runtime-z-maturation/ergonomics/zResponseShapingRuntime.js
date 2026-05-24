'use strict';

const flags = require('../config/sz3FeatureFlags');

/**
 * Molda o envelope de resposta baseado na ergonomia calculada.
 *
 * Não gera texto — filtra e prioriza os blocos de informação que devem
 * aparecer na resposta, na ordem correcta, com o nível de detalhe certo.
 */
function shapeResponse({
  ergonomics = {},
  narrative = {},
  actions = {},
  calibration = {},
  patternMatch = {}
} = {}) {
  if (!flags.isErgonomicsEnabled()) {
    return { shaped: false, blocks: ['narrative', 'actions', 'context'] };
  }

  const { verbosity = 'normal', max_actions = 3, show_rationale = false, focus_order = [] } = ergonomics;

  // Filtra acções pelo máximo ergonómico
  const visibleActions = (actions?.actions || []).slice(0, max_actions);

  // Define blocos a incluir na resposta
  const blocks = [];
  for (const focus of focus_order) {
    if (focus === 'critical_alert') blocks.push('critical_alert');
    if (focus === 'urgency_signal') blocks.push('urgency_badge');
    if (focus === 'primary_action' && visibleActions.length) blocks.push('actions');
    if (focus === 'rationale' && show_rationale) blocks.push('rationale');
    if (focus === 'context_summary') blocks.push('narrative');
  }

  // sempre inclui narrative se não for só compacto
  if (verbosity !== 'compact' && !blocks.includes('narrative')) blocks.push('narrative');

  // pattern hint — apenas se não compacto e padrão encontrado
  if (verbosity !== 'compact' && patternMatch?.top) {
    blocks.push('pattern_hint');
  }

  return {
    shaped: true,
    blocks,
    visible_actions: visibleActions,
    max_actions,
    verbosity,
    format_hint: ergonomics.format_hint || 'structured',
    include_rationale: show_rationale
  };
}

module.exports = { shapeResponse };
