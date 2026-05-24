'use strict';

const { buildPreparedAction } = require('./zActionSimulationRuntime');

function prepareEscalation(reasoning = {}) {
  const esc = reasoning?.escalation;
  if (!esc || esc.suggested_escalation === 'self') return null;
  return buildPreparedAction({
    kind: 'escalation_prepared',
    title: `Sugestão de escalonamento para ${esc.suggested_escalation.replace(/_/g, ' ')}`,
    description:
      'Z sugere envolver outro nível hierárquico. Nada é escalado automaticamente.',
    inputs: { rationale: esc.rationale },
    expected_outputs: ['escalation_notice_draft'],
    required_approvals: ['human_operator', esc.suggested_escalation],
    domain: 'governance',
    tags: ['escalation', esc.suggested_escalation]
  });
}

module.exports = { prepareEscalation };
