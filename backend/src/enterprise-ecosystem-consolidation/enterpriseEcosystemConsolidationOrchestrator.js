'use strict';

const runtimeVal = require('./enterpriseEcosystemRuntimeValidator');
const soak = require('./enterpriseStabilitySoakEngine');
const cognitive = require('./enterpriseCognitiveMaturityIndex');
const governance = require('./enterpriseGovernanceValidator');
const environment = require('./environmentDevelopmentReadinessEngine');

let obs;
try {
  obs = require('../services/operational/enterpriseObservabilityRuntime');
} catch {
  obs = { recordMetric: () => {} };
}

function runEcosystemFinalConsolidation(reqBody = {}) {
  const tenantId = reqBody.tenant_id || null;
  const runSoak = reqBody.run_soak !== false;
  const soakDry = reqBody.soak_dry_run === true;

  const ecosystem_runtime = runtimeVal.validateEcosystemRuntime({ ...reqBody, tenant_id: tenantId });
  const stability_soak = runSoak
    ? soak.runEnterpriseStabilitySoak({ dry_run: soakDry, check_pm2: reqBody.check_pm2 })
    : { ok: true, stable: true, skipped: true };

  const cognitiveInput = {
    menu_extra_count: reqBody.menu_extra_count ?? 2,
    view_count: reqBody.view_count ?? 1,
    branching_factor: reqBody.branching_factor ?? 1,
    dashboard_widget_count: reqBody.dashboard_widget_count ?? 4,
    navigation_events_per_min: reqBody.navigation_events_per_min ?? 4,
    decision_density: reqBody.decision_density ?? 8
  };
  const cognitive_maturity_index = cognitive.computeEnterpriseCognitiveMaturityIndex(cognitiveInput);

  const governance_validation = governance.validateEnterpriseGovernance({
    tenant_id: tenantId,
    runtime_validation: ecosystem_runtime.runtime_snapshot,
    cognitive_maturity: cognitive_maturity_index,
    bounded_publication: ecosystem_runtime.publication?.bounded_publication,
    audience_samples: reqBody.audience_samples
  });

  const pack = {
    ok: true,
    framework: 'enterprise_ecosystem_final_consolidation',
    phase: 'ecosystem_correlation',
    tenant_id: tenantId,
    generated_at: new Date().toISOString(),
    domains: ['quality', 'safety', 'logistics', 'environment'],
    ecosystem_runtime,
    stability_soak,
    cognitive_maturity_index,
    governance_validation,
    environment_decision: null
  };

  pack.environment_decision = environment.decideEnvironmentReadiness(pack);

  try {
    const correlation = require('../ecosystem-correlation/ecosystemCorrelationRuntime');
    pack.ecosystem_correlation = correlation.ecosystemCorrelationRuntime({
      tenant_id: tenantId,
      signals: reqBody.signals || {}
    });
  } catch (_e) {
    pack.ecosystem_correlation = { ok: false, skipped: true };
  }

  try {
    const hardening = require('../enterprise-hardening/enterpriseOperationalHardeningRuntime');
    pack.enterprise_hardening = hardening.enterpriseOperationalHardeningRuntime({
      tenant_id: tenantId,
      hardening_context: reqBody.hardening_context || {}
    });
  } catch (_e) {
    pack.enterprise_hardening = { ok: false, skipped: true };
  }

  try {
    obs.recordMetric('enterprise_ecosystem_ecmi', pack.cognitive_maturity_index.enterprise_cognitive_maturity_index, {
      tenant: tenantId ? String(tenantId).slice(0, 8) : 'none'
    });
    obs.recordMetric(
      'environment_readiness_decision',
      pack.environment_decision.environment_ready ? 1 : 0,
      { tenant: 'global' }
    );
  } catch (_e) {
    /* noop */
  }

  return pack;
}

module.exports = { runEcosystemFinalConsolidation };
