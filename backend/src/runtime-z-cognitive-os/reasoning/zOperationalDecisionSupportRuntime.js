'use strict';

const { reasonIndustrial } = require('./zIndustrialReasoningRuntime');

/**
 * Decision support assistive — devolve recomendações textuais com base no
 * raciocínio industrial. NUNCA gera comandos de execução.
 */
function buildDecisionSupport(tenantId, text = '', ctx = {}) {
  const reasoning = reasonIndustrial(tenantId, text, ctx);
  const recommendations = [];

  if (reasoning.escalation.suggested_escalation !== 'self') {
    recommendations.push({
      kind: 'escalation_suggestion',
      label: `Recomendar revisão por ${reasoning.escalation.suggested_escalation.replace(/_/g, ' ')}`,
      requires_human_review: true
    });
  }

  if (reasoning.priority.tier === 'P1' || reasoning.priority.tier === 'P2') {
    recommendations.push({
      kind: 'priority_alert',
      label: `Prioridade ${reasoning.priority.tier} sugerida (não vinculativa)`,
      requires_human_review: true
    });
  }

  if (reasoning.detected_risks.length) {
    recommendations.push({
      kind: 'cross_domain_correlation',
      label: `Correlacionar com domínios: ${reasoning.detected_risks.join(', ')}`,
      requires_human_review: true
    });
  }

  if (ctx?.continuity?.inherited_context) {
    recommendations.push({
      kind: 'context_inheritance',
      label: `Continuar a partir do contexto: "${ctx.continuity.inherited_context.summary || ''}"`,
      requires_human_review: false
    });
  }

  return {
    reasoning,
    recommendations,
    assistive_only: true,
    auto_execution: false,
    decision_quality_score: reasoning.industrial_intelligence_score
  };
}

module.exports = { buildDecisionSupport };
