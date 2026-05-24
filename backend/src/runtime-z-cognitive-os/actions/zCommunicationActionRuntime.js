'use strict';

const { buildPreparedAction } = require('./zActionSimulationRuntime');

function prepareCommunicationFromContext(continuity = {}, context = {}, message = '') {
  const inherited = continuity?.inherited_context;
  if (!inherited) return null;

  return buildPreparedAction({
    kind: 'communication_prepared',
    title: `Comunicado preparado a partir de: "${(inherited.summary || '').slice(0, 80)}"`,
    description:
      'Z preparou um comunicado com base no contexto herdado. Nada será enviado sem aprovação humana explícita.',
    inputs: {
      base_context_summary: inherited.summary,
      base_context_intent: inherited.intent,
      current_request: String(message || '').slice(0, 240),
      anchors: inherited.anchors,
      shift: context?.shift?.shift_name,
      urgency: context?.urgency?.level
    },
    expected_outputs: ['draft_communication', 'recipient_inference', 'confirmation_tracking_plan'],
    required_approvals: ['human_operator', 'department_lead'],
    domain: 'communications',
    tags: ['communication', 'context_inherited'],
    rationale: {
      from_turn_id: inherited.from_turn_id,
      anchors: inherited.anchors,
      continuation_score: continuity.continuation_score
    }
  });
}

module.exports = { prepareCommunicationFromContext };
