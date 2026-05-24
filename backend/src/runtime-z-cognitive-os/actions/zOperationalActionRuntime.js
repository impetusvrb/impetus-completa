'use strict';

const flags = require('../config/sz2FeatureFlags');
const { prepareCommunicationFromContext } = require('./zCommunicationActionRuntime');
const { prepareConfirmationTracking } = require('./zConfirmationTrackingRuntime');
const { prepareTaskBundle } = require('./zTaskGenerationRuntime');
const { prepareEscalation } = require('./zEscalationActionRuntime');
const { prepareWorkflowAssistance } = require('./zWorkflowAssistiveRuntime');
const { reviewPreparedAction } = require('./zAssistiveExecutionRuntime');

function prepareOperationalActions({ message = '', continuity = {}, context = {}, reasoning = {} } = {}) {
  if (!flags.isActionsEnabled()) return { actions: [], skipped: true };

  const prepared = [];

  const comm = prepareCommunicationFromContext(continuity, context, message);
  if (comm) prepared.push(comm);

  const conf = prepareConfirmationTracking(continuity, context);
  if (conf) prepared.push(conf);

  const tasks = prepareTaskBundle(reasoning, continuity);
  for (const t of tasks) prepared.push(t);

  const esc = prepareEscalation(reasoning);
  if (esc) prepared.push(esc);

  const wfa = prepareWorkflowAssistance(continuity);
  if (wfa) prepared.push(wfa);

  const reviewed = prepared.map(reviewPreparedAction);

  return {
    actions: prepared,
    reviewed,
    count: prepared.length,
    assistive_only: true,
    auto_execution: false,
    plc_control: false,
    requires_human_authority: true
  };
}

module.exports = { prepareOperationalActions };
