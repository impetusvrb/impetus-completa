'use strict';

const path = require('path');
const { check, phaseResult } = require('./common/readinessResult');

const ROOT = path.resolve(__dirname, '../..');

function validate() {
  const checks = [];

  try {
    require(path.join(ROOT, 'services/featureGovernanceService'));
    checks.push(check('feature_governance_service_load', true));
  } catch (e) {
    checks.push(check('feature_governance_service_load', false, 'fail', e.message));
  }

  try {
    require(path.join(ROOT, 'cognitiveBudget/cognitiveBudgetFlags'));
    checks.push(check('cognitive_budget_flags_load', true));
  } catch (e) {
    checks.push(check('cognitive_budget_flags_load', false, 'warn', e.message));
  }

  try {
    require(path.join(ROOT, 'storage/storageFlags'));
    checks.push(check('storage_flags_load', true));
  } catch (e) {
    checks.push(check('storage_flags_load', false, 'fail', e.message));
  }

  try {
    require(path.join(ROOT, 'storage/telemetryIsolationService'));
    checks.push(check('telemetry_isolation_service_load', true));
  } catch (e) {
    checks.push(check('telemetry_isolation_service_load', false, 'fail', e.message));
  }

  checks.push(
    check(
      'node_env_manual_review',
      false,
      'warn',
      'Validar manualmente NODE_ENV/IMPETUS_INTERNAL_ROUTES em produção (não inferido neste suite).'
    )
  );

  return phaseResult('P2', 'Startup Integrity (load-only)', checks);
}

module.exports = { validate };
