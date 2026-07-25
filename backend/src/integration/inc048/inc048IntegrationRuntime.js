'use strict';

const { isInc048Enabled } = require('./inc048FeatureFlags');
const { getInc048Registry } = require('./inc048Registry');
const { buildCompatibilityMatrix } = require('./inc048CompatibilityMatrix');
const { CONVERGENCE_FLOW, INC048_CONTRACT_VERSION } = require('./inc048Contracts');
const { logInc048Event } = require('./inc048Observability');
const { validatePilotContracts } = require('../../domains/supply/pilot/supplyPilotIntegrationLayer');
const { snapshotPilotCompatibility } = require('../../domains/supply/pilot/supplyPilotRegistry');

async function validateCrossDomain(ctx = {}) {
  const t0 = Date.now();
  const issues = [];
  const checks = [];

  const pilotValidation = validatePilotContracts();
  checks.push({ id: 'pilot_contracts', ok: pilotValidation.valid, issues: pilotValidation.issues });
  if (!pilotValidation.valid) issues.push(...pilotValidation.issues);

  const pilotCompat = snapshotPilotCompatibility();
  checks.push({ id: 'pilot_wms_compat', ok: pilotCompat.compatible, version: pilotCompat.version });
  if (!pilotCompat.compatible) issues.push('pilot_wms_incompatible');

  const matrix = buildCompatibilityMatrix();
  checks.push({ id: 'compatibility_matrix', ok: matrix.all_compatible, rows: matrix.rows.length });
  if (!matrix.all_compatible) {
    for (const row of matrix.rows.filter((r) => !r.compatible)) {
      issues.push(`incompatible:${row.component}`);
    }
  }

  const registry = getInc048Registry();
  checks.push({ id: 'supply_homologation', ok: registry.supply_runtime.maturity === 'homologation' });
  checks.push({ id: 'wms_workspace_phase', ok: registry.logistics_runtime.workspace_phase === 'WMS-004' });
  checks.push({ id: 'convergence_flow', ok: CONVERGENCE_FLOW.length === 8 });

  if (ctx.run_pilot_integration && (isInc048Enabled() || ctx.force_inc048)) {
    const { runSupplyPilotIntegration } = require('../../domains/supply/pilot/supplyPilotIntegrationLayer');
    const integration = await runSupplyPilotIntegration(
      ctx.user || { company_id: ctx.company_id, profile_code: 'manager_supply' },
      { ...ctx, force_supply_pilot: true, force_logistics_bridge: true, mock_logistics_api: ctx.mock_logistics_api || {} },
      ctx.promotion_result || { promoted_blocks: [], promotion_ratio: 0.5 }
    );
    checks.push({ id: 'pilot_integration_e2e', ok: integration.ok === true || integration.skipped === true });
    if (!integration.ok && !integration.skipped) issues.push(integration.reason || 'pilot_integration_failed');
  }

  const duration_ms = Date.now() - t0;
  const valid = issues.length === 0;

  logInc048Event({
    event: 'CROSS_DOMAIN_VALIDATION',
    valid,
    issues_count: issues.length,
    duration_ms,
    contracts: INC048_CONTRACT_VERSION
  });

  return Object.freeze({
    ok: valid,
    valid,
    issues,
    checks,
    matrix,
    registry,
    duration_ms,
    flow: CONVERGENCE_FLOW
  });
}

async function runInc048Convergence(ctx = {}) {
  const t0 = Date.now();

  if (!isInc048Enabled() && !ctx.force_inc048) {
    logInc048Event({ event: 'CONVERGENCE_SKIPPED', reason: 'INC048_DISABLED' });
    return Object.freeze({
      ok: false,
      skipped: true,
      reason: 'INC048_DISABLED',
      phase: 'INC-048'
    });
  }

  const validation = await validateCrossDomain({ ...ctx, run_pilot_integration: true });
  const duration_ms = Date.now() - t0;

  logInc048Event({
    event: 'CONVERGENCE_RUN',
    ok: validation.valid,
    duration_ms,
    latency_ms: duration_ms
  });

  return Object.freeze({
    ok: validation.valid,
    skipped: false,
    phase: 'INC-048',
    contract_version: INC048_CONTRACT_VERSION,
    convergence_flow: CONVERGENCE_FLOW,
    validation,
    duration_ms
  });
}

function getConvergenceSnapshot() {
  return Object.freeze({
    enabled: isInc048Enabled(),
    registry: getInc048Registry(),
    matrix: buildCompatibilityMatrix(),
    flow: CONVERGENCE_FLOW,
    contract_version: INC048_CONTRACT_VERSION
  });
}

module.exports = {
  validateCrossDomain,
  runInc048Convergence,
  getConvergenceSnapshot
};
