'use strict';

const _samples = {
  dry_runs: 0,
  executions: 0,
  rollbacks_planned: 0,
  health_checks: 0,
  last_deploy_at: null,
  last_approved_by: null
};

function recordDeployDryRun(meta = {}) {
  _samples.dry_runs += 1;
  if (meta.approved_by) _samples.last_approved_by = meta.approved_by;
}

function recordDeployExecution(meta = {}) {
  _samples.executions += 1;
  _samples.last_deploy_at = new Date().toISOString();
  if (meta.approved_by) _samples.last_approved_by = meta.approved_by;
}

function recordHealthCheck() {
  _samples.health_checks += 1;
}

function recordRollbackPlan() {
  _samples.rollbacks_planned += 1;
}

function getDeploymentTelemetry() {
  return { ..._samples };
}

function resetDeploymentTelemetry() {
  _samples.dry_runs = 0;
  _samples.executions = 0;
  _samples.rollbacks_planned = 0;
  _samples.health_checks = 0;
  _samples.last_deploy_at = null;
  _samples.last_approved_by = null;
}

module.exports = {
  recordDeployDryRun,
  recordDeployExecution,
  recordHealthCheck,
  recordRollbackPlan,
  getDeploymentTelemetry,
  resetDeploymentTelemetry
};
