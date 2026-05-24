'use strict';

const { buildPreparedAction } = require('./zActionSimulationRuntime');

function prepareConfirmationTracking(continuity = {}, context = {}) {
  const inherited = continuity?.inherited_context;
  if (!inherited) return null;

  return buildPreparedAction({
    kind: 'confirmation_tracking_prepared',
    title: 'Lista de confirmação preparada (não publicada)',
    description:
      'Z preparou o plano de tracking de confirmações para o contexto herdado. Aguarda aprovação humana.',
    inputs: {
      base_context_summary: inherited.summary,
      anchors: inherited.anchors,
      shift: context?.shift?.shift_name
    },
    expected_outputs: ['recipient_list_draft', 'confirmation_form', 'reminder_schedule'],
    required_approvals: ['human_operator'],
    domain: 'communications',
    tags: ['confirmation_tracking', 'context_inherited'],
    rationale: {
      from_turn_id: inherited.from_turn_id,
      continuation_score: continuity.continuation_score
    }
  });
}

module.exports = { prepareConfirmationTracking };
