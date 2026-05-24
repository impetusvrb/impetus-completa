'use strict';

const { buildWorkflowContinuation } = require('../continuity/zWorkflowContinuationRuntime');

function buildWorkflowContext(tenantId) {
  const wf = buildWorkflowContinuation(tenantId);
  return {
    has_active_workflow: wf.has_active_workflow,
    active_workflows: wf.active_workflows,
    latest_workflow: wf.latest_workflow
  };
}

module.exports = { buildWorkflowContext };
