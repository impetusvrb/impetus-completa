'use strict';

/**
 * WAVE 2 — agregação de observabilidade por workflow.
 */

const { isWorkflowObservabilityEnabled } = require('./observabilityFlags');
const workflowTracing = require('./workflowTracingService');
const eventLag = require('./eventLagMonitor');

function getWorkflowObservabilitySnapshot() {
  if (!isWorkflowObservabilityEnabled()) {
    return { enabled: false };
  }

  return {
    enabled: true,
    active_workflows: workflowTracing.getActiveWorkflows(25),
    event_lag: eventLag.getLagStats(),
    timestamp: new Date().toISOString()
  };
}

/**
 * @param {string} workflowId
 */
function getWorkflowDetail(workflowId) {
  if (!isWorkflowObservabilityEnabled()) return null;
  const wf = workflowTracing.getWorkflow(workflowId);
  if (!wf) return null;
  return Object.assign({}, wf, { event_lag: eventLag.getLagStats() });
}

module.exports = {
  getWorkflowObservabilitySnapshot,
  getWorkflowDetail
};
