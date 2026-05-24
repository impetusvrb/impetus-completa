'use strict';

const wf = require('../memory/zWorkflowMemoryRuntime');

function buildWorkflowContinuation(tenantId) {
  const active = wf.activeWorkflows(tenantId);
  const latest = wf.latestWorkflow(tenantId);
  return {
    active_count: active.length,
    active_workflows: active.map((w) => ({
      id: w.id,
      summary: w.summary,
      state: w?.payload?.state,
      pending_inputs: w?.payload?.pending_inputs || [],
      ts: w.ts
    })),
    latest_workflow: latest
      ? { id: latest.id, summary: latest.summary, state: latest?.payload?.state, ts: latest.ts }
      : null,
    has_active_workflow: active.length > 0
  };
}

module.exports = { buildWorkflowContinuation };
