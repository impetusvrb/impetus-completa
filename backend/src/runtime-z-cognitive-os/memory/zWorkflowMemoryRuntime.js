'use strict';

const omr = require('./zOperationalMemoryRuntime');

const TYPE = 'workflow';

function recordWorkflow(tenantId, user, wf = {}) {
  return omr.record(tenantId, {
    type: TYPE,
    user_id: user?.id || null,
    summary: wf.summary || wf.title || 'workflow',
    intent: wf.intent || null,
    payload: {
      workflow_id: wf.workflow_id || null,
      steps: wf.steps || [],
      state: wf.state || 'preparing',
      pending_inputs: wf.pending_inputs || []
    },
    tags: wf.tags || [],
    domain: wf.domain || null,
    correlation_id: wf.workflow_id || null
  });
}

function activeWorkflows(tenantId) {
  return omr
    .list(tenantId, { type: TYPE })
    .filter((e) => ['preparing', 'awaiting_human', 'in_progress'].includes(e?.payload?.state));
}

function latestWorkflow(tenantId) {
  const list = omr.index(tenantId).byTypeRecent(TYPE, 1);
  return list[0] || null;
}

module.exports = { recordWorkflow, activeWorkflows, latestWorkflow, TYPE };
