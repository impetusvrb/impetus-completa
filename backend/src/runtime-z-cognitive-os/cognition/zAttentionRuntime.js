'use strict';

/**
 * Define onde a IA deve "focar" na próxima resposta — heurístico, não
 * vinculativo. Apenas sugere ordem de prioridade.
 */
function computeAttention({ continuity = {}, reasoning = {}, context = {} } = {}) {
  const order = [];
  if (continuity?.inherited_context) order.push('inherited_context');
  if (reasoning?.priority?.tier === 'P1' || reasoning?.priority?.tier === 'P2') order.push('priority_alert');
  if (context?.operational?.critical_incidents > 0) order.push('critical_incidents');
  if (continuity?.workflow?.has_active_workflow) order.push('active_workflow');
  if (context?.cross_domain?.multi_domain) order.push('cross_domain_correlation');
  if (!order.length) order.push('current_message_only');
  return {
    focus_order: order,
    primary_focus: order[0],
    attention_breadth: order.length
  };
}

module.exports = { computeAttention };
