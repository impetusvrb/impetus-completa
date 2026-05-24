'use strict';

const { buildPreparedAction } = require('./zActionSimulationRuntime');

function prepareTaskBundle(reasoning = {}, continuity = {}) {
  const bundle = [];
  if (reasoning?.priority?.tier === 'P1' || reasoning?.priority?.tier === 'P2') {
    bundle.push(
      buildPreparedAction({
        kind: 'task_review_high_priority',
        title: `Revisão prioritária (${reasoning.priority.tier}) sugerida`,
        description: 'Tarefa preparada para revisão humana. Nada é criado sem aprovação.',
        inputs: {
          tier: reasoning.priority.tier,
          criticality: reasoning?.criticality?.level
        },
        expected_outputs: ['task_draft'],
        required_approvals: ['supervisor'],
        domain: 'operations',
        tags: ['task', 'high_priority']
      })
    );
  }
  if (continuity?.workflow?.has_active_workflow) {
    bundle.push(
      buildPreparedAction({
        kind: 'task_continue_workflow',
        title: 'Continuação de workflow activo',
        description: 'Z identificou um workflow em curso. Plano de continuação preparado.',
        inputs: {
          active_workflows: (continuity.workflow.active_workflows || []).slice(0, 3)
        },
        expected_outputs: ['workflow_next_step_draft'],
        required_approvals: ['workflow_owner'],
        domain: 'operations',
        tags: ['task', 'workflow_continuation']
      })
    );
  }
  return bundle;
}

module.exports = { prepareTaskBundle };
