'use strict';

const { listScenarios, SUCCESS_CRITERIA } = require('./wms005ScenarioCatalog');
const { buildPilotMatrixFromResults } = require('./wms005PilotMatrix');
const { validateRbacProfiles } = require('./wms005RbacValidator');
const { validateFeatureFlagModes } = require('./wms005FeatureFlagValidator');
const { validateWorkspaceRegistration } = require('./wms005WorkspaceValidator');
const { validateCommandCenterCoexistence } = require('./wms005CcValidator');
const { logWms005Event, getWms005ObservabilitySnapshot } = require('./wms005Observability');
const { validateCrossDomain } = require('../../integration/inc048/inc048IntegrationRuntime');

async function runIntegratedValidation(ctx = {}) {
  const t0 = Date.now();
  const scenarioResults = ctx.scenario_results || [];
  const rbac = validateRbacProfiles();
  const flags = validateFeatureFlagModes();
  const workspace = validateWorkspaceRegistration();
  const cc = validateCommandCenterCoexistence();
  const crossDomain = await validateCrossDomain({ force_inc048: true, ...ctx });

  const matrix =
    scenarioResults.length > 0
      ? buildPilotMatrixFromResults(scenarioResults)
      : buildPilotMatrixFromResults([]);
  const issues = [];

  if (!rbac.valid) issues.push('rbac_validation_failed');
  if (!flags.valid) issues.push('feature_flag_validation_failed');
  if (!workspace.valid) issues.push('workspace_validation_failed');
  if (!cc.valid) issues.push('cc_validation_failed');
  if (!crossDomain.valid) issues.push('cross_domain_failed');
  if (scenarioResults.length && !scenarioResults.every((s) => s.pass)) issues.push('scenario_failures');
  if (scenarioResults.length && (!matrix.all_pass || matrix.rows.length !== scenarioResults.length)) {
    issues.push('pilot_matrix_incomplete');
  }

  const valid = issues.length === 0;

  logWms005Event({
    event: 'INTEGRATED_VALIDATION',
    valid,
    issues_count: issues.length,
    duration_ms: Date.now() - t0,
    telemetry_entries: getWms005ObservabilitySnapshot(5).length
  });

  return Object.freeze({
    ok: valid,
    valid,
    phase: 'WMS-005',
    issues,
    rbac,
    flags,
    workspace,
    cc,
    cross_domain: crossDomain,
    pilot_matrix: matrix,
    success_criteria: SUCCESS_CRITERIA,
    scenarios_catalog: listScenarios().map((s) => s.id),
    duration_ms: Date.now() - t0
  });
}

module.exports = {
  runIntegratedValidation
};
