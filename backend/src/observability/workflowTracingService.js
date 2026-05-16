'use strict';

/**
 * WAVE 2 — workflow tracing (spans por workflow_id, integrado com observability runtime).
 */

const { v4: uuidv4 } = require('uuid');
const { isWorkflowTracingEnabled } = require('./observabilityFlags');
const { getContext, runWithContext } = require('./correlationContext');
const tenantMetrics = require('./tenantMetricsRegistry');

const _workflows = new Map();
const MAX_WORKFLOWS = 500;

let _enterpriseObs = null;
function _obs() {
  if (_enterpriseObs) return _enterpriseObs;
  try {
    _enterpriseObs = require('../services/operational/enterpriseObservabilityRuntime');
  } catch (_e) {
    _enterpriseObs = null;
  }
  return _enterpriseObs;
}

/**
 * @param {string} workflowType — ex: ncr, capa, chat_pipeline
 * @param {object} [attrs]
 */
function startWorkflow(workflowType, attrs = {}) {
  if (!isWorkflowTracingEnabled()) return null;

  const ctx = getContext();
  const workflowId = attrs.workflow_id || ctx.workflow_id || `wf_${uuidv4()}`;
  const correlationId = attrs.correlation_id || ctx.correlation_id || workflowId;

  const obs = _obs();
  let traceRef = { traceId: null, spanId: null };
  if (obs && obs.isEnabled && obs.isEnabled()) {
    traceRef = obs.startTrace(`workflow.${workflowType}`, {
      workflow_id: workflowId,
      correlation_id: correlationId,
      company_id: attrs.company_id || ctx.company_id
    });
  }

  const wf = {
    workflow_id: workflowId,
    workflow_type: String(workflowType).slice(0, 64),
    correlation_id: correlationId,
    company_id: attrs.company_id || ctx.company_id || null,
    trace_id: traceRef.traceId,
    started_at: Date.now(),
    steps: [],
    status: 'active'
  };

  _workflows.set(workflowId, wf);
  if (_workflows.size > MAX_WORKFLOWS) {
    const first = _workflows.keys().next().value;
    _workflows.delete(first);
  }

  tenantMetrics.incrementCounter(
    'impetus_workflow_started_total',
    1,
    { workflow_type: wf.workflow_type },
    { company_id: wf.company_id }
  );

  return { workflow_id: workflowId, trace_id: traceRef.traceId };
}

/**
 * @param {string} workflowId
 * @param {string} stepName
 * @param {object} [attrs]
 */
function recordWorkflowStep(workflowId, stepName, attrs = {}) {
  if (!isWorkflowTracingEnabled()) return null;

  return runWithContext({ workflow_id: workflowId, causation_id: workflowId }, () => {
    const wf = _workflows.get(workflowId);
    if (!wf) return null;

    const step = {
      name: String(stepName).slice(0, 128),
      started_at: Date.now(),
      attributes: attrs,
      status: 'ok'
    };
    wf.steps.push(step);
    if (wf.steps.length > 100) wf.steps.shift();

    const obs = _obs();
    if (obs && wf.trace_id) {
      obs.addSpan(wf.trace_id, step.name, attrs);
    }

    tenantMetrics.incrementCounter(
      'impetus_workflow_steps_total',
      1,
      { workflow_type: wf.workflow_type, step: step.name },
      { company_id: wf.company_id }
    );

    return step;
  });
}

function endWorkflow(workflowId, status = 'ok') {
  if (!isWorkflowTracingEnabled()) return null;

  const wf = _workflows.get(workflowId);
  if (!wf) return null;

  wf.status = status;
  wf.ended_at = Date.now();
  wf.duration_ms = wf.ended_at - wf.started_at;

  const obs = _obs();
  if (obs && wf.trace_id) {
    obs.endTrace(wf.trace_id, status === 'ok' ? 'ok' : 'error');
  }

  tenantMetrics.incrementCounter(
    'impetus_workflow_completed_total',
    1,
    { workflow_type: wf.workflow_type, status: String(status).slice(0, 32) },
    { company_id: wf.company_id }
  );

  tenantMetrics.observeHistogram('impetus_workflow_duration_ms', wf.duration_ms, { workflow_type: wf.workflow_type }, { company_id: wf.company_id });

  return {
    workflow_id: workflowId,
    duration_ms: wf.duration_ms,
    step_count: wf.steps.length,
    status
  };
}

function getActiveWorkflows(limit = 20) {
  return [..._workflows.values()]
    .filter((w) => w.status === 'active')
    .slice(-limit)
    .map((w) => ({
      workflow_id: w.workflow_id,
      workflow_type: w.workflow_type,
      correlation_id: w.correlation_id,
      step_count: w.steps.length,
      age_ms: Date.now() - w.started_at
    }));
}

function getWorkflow(workflowId) {
  const wf = _workflows.get(workflowId);
  if (!wf) return null;
  return {
    workflow_id: wf.workflow_id,
    workflow_type: wf.workflow_type,
    correlation_id: wf.correlation_id,
    status: wf.status,
    duration_ms: wf.duration_ms,
    steps: wf.steps.slice(-20)
  };
}

module.exports = {
  startWorkflow,
  recordWorkflowStep,
  endWorkflow,
  getActiveWorkflows,
  getWorkflow
};
