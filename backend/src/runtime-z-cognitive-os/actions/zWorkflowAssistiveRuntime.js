'use strict';

const { buildPreparedAction } = require('./zActionSimulationRuntime');

function prepareWorkflowAssistance(continuity = {}) {
  const wfs = continuity?.workflow?.active_workflows || [];
  if (!wfs.length) return null;
  return buildPreparedAction({
    kind: 'workflow_assistance_prepared',
    title: `Assistência para ${wfs.length} workflow(s) activo(s)`,
    description: 'Z preparou um resumo do estado actual e dos próximos passos sugeridos.',
    inputs: { workflows: wfs.slice(0, 5) },
    expected_outputs: ['workflow_status_summary', 'next_steps_draft'],
    required_approvals: ['workflow_owner'],
    domain: 'operations',
    tags: ['workflow', 'assistive']
  });
}

module.exports = { prepareWorkflowAssistance };
