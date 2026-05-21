'use strict';

const flags = require('./config/phaseZ17FeatureFlags');
const { logPhaseZ17 } = require('./phaseZ17Logger');
const persistence = require('./tenantActivationPersistence');
const reactivation = require('./pilotReactivationCoordinator');
const freezeValidator = require('./runtimeFreezeStateValidator');
const determinismValidator = require('./refreshDeterminismValidator');
const domainValidator = require('./domainIsolationValidator');
const kpiValidator = require('./kpiGovernanceValidator');
const summaryValidator = require('./summaryGovernanceValidator');
const underdeliveryValidator = require('./underdeliveryRiskValidator');
const cockpitValidator = require('./cockpitOperationalValidator');

function validationActive(ctx = {}) {
  return (
    flags.isOperationalValidationEnabled() ||
    flags.isOperationalValidationObservabilityEnabled() ||
    ctx.force_validation === true
  );
}

function buildOperationalConvergenceReport(payload = {}, ctx = {}) {
  if (!validationActive(ctx)) {
    return { phase: 'Z.17', validation_skipped: true, reason: 'operational_validation_off' };
  }

  const freeze = freezeValidator.validateRuntimeFreezeState(payload);
  const determinism = determinismValidator.validateRefreshDeterminism(payload, ctx);
  const domain = domainValidator.validateDomainIsolation(payload, ctx);
  const kpis = kpiValidator.validateKpiGovernance(payload.kpis || [], ctx);
  const summary = summaryValidator.validateSummaryGovernance(payload, { ...ctx, cockpit_kpis: payload.kpis });
  const underdelivery = underdeliveryValidator.validateUnderdeliveryRisk(payload, ctx);
  const cockpit = cockpitValidator.validateCockpitOperational(payload, ctx);

  const pilots = persistence.listPersistedTenants();
  const pilotStable = pilots.every((p) => p.reload_recovery_ready) || pilots.length === 0;

  const highest_risk_areas = [];
  if (!freeze.freeze_state_valid) highest_risk_areas.push('terminal_freeze');
  if (determinism.oscillation_detected) highest_risk_areas.push('menu_oscillation');
  const domainViolations = (domain.violations || []).some(
    (v) => v.kpi_cross_domain || v.summary_cross_domain || !v.menu_valid
  );
  if (!domain.domain_isolation_valid || domainViolations) highest_risk_areas.push('domain_isolation');
  if (kpis.kpi_leakage_detected) highest_risk_areas.push('kpi_leakage');
  if (summary.summary_cross_domain_detected) highest_risk_areas.push('summary_bleed');
  if (underdelivery.underdelivery_risk === 'high') highest_risk_areas.push('underdelivery');
  if (cockpit.cockpit_bleed) highest_risk_areas.push('cockpit_bleed');

  const stabilization_recommendations = [];
  if (!freeze.freeze_state_valid) {
    stabilization_recommendations.push(freeze.rollback_recommendation || { action: 'review_terminal_lock' });
  }
  if (determinism.reinjection_after_refresh) {
    stabilization_recommendations.push({ action: 'block_legacy_merges', channel: 'frontend' });
  }
  if (kpis.kpi_leakage_detected) {
    stabilization_recommendations.push({ action: 'enable_terminal_kpi_lock' });
  }
  if (underdelivery.underdelivery_risk === 'high') {
    stabilization_recommendations.push({ action: 'review_minimum_visibility', graceful: true });
  }

  const report = {
    phase: 'Z.17',
    layer: 'operational-convergence-validation',
    freeze_state_valid: freeze.freeze_state_valid,
    governance_locked: payload.governance_freeze_state?.governance_locked === true,
    determinism_validated: determinism.determinism_validated,
    oscillation_detected: determinism.oscillation_detected,
    domain_isolation_valid: domain.domain_isolation_valid,
    kpi_leakage_detected: kpis.kpi_leakage_detected,
    summary_cross_domain_detected: summary.summary_cross_domain_detected,
    underdelivery_risk: underdelivery.underdelivery_risk,
    cockpit_integrity: cockpit.cockpit_integrity,
    operational_usefulness: cockpit.operational_usefulness,
    pilot_runtime_stable: pilotStable,
    persisted_pilots: pilots.length,
    highest_risk_areas,
    stabilization_recommendations,
    validators: { freeze, determinism, domain, kpis, summary, underdelivery, cockpit },
    auto_remediate: false,
    shadow_only: !flags.isOperationalValidationEnabled()
  };

  if (flags.isOperationalValidationObservabilityEnabled() && highest_risk_areas.length) {
    logPhaseZ17('OPERATIONAL_CONVERGENCE_RISK', { highest_risk_areas, tenant_id: ctx.tenant_id });
  }

  return report;
}

function applyOperationalValidationToDashboard(user = {}, payload = {}, ctx = {}) {
  const report = buildOperationalConvergenceReport(payload, {
    ...ctx,
    tenant_id: user?.company_id,
    profile: ctx.profile || payload.profile_code || 'quality'
  });
  return {
    operational_convergence_report: report,
    validation_active: validationActive(ctx)
  };
}

function getOperationalValidationStatus(ctx = {}) {
  return {
    phase: 'Z.17',
    operational_validation: flags.isOperationalValidationEnabled(),
    pilot_reactivation: flags.isPilotReactivationEnabled(),
    refresh_determinism: flags.isRefreshDeterminismValidationEnabled(),
    domain_isolation: flags.isDomainIsolationValidationEnabled(),
    runtime_freeze: flags.isRuntimeFreezeValidationEnabled(),
    observability: flags.isOperationalValidationObservabilityEnabled(),
    persisted_tenants: persistence.listPersistedTenants().length,
    ...ctx
  };
}

module.exports = {
  validationActive,
  buildOperationalConvergenceReport,
  applyOperationalValidationToDashboard,
  getOperationalValidationStatus,
  recoverApprovedPilotsOnBoot: reactivation.recoverApprovedPilotsOnBoot,
  coordinateSupervisedReactivation: reactivation.coordinateSupervisedReactivation,
  recordPilotActivation: reactivation.recordPilotActivation,
  validateRuntimeFreezeState: freezeValidator.validateRuntimeFreezeState,
  validateRefreshDeterminism: determinismValidator.validateRefreshDeterminism,
  validateDomainIsolation: domainValidator.validateDomainIsolation,
  validateKpiGovernance: kpiValidator.validateKpiGovernance,
  validateSummaryGovernance: summaryValidator.validateSummaryGovernance,
  validateUnderdeliveryRisk: underdeliveryValidator.validateUnderdeliveryRisk,
  validateCockpitOperational: cockpitValidator.validateCockpitOperational,
  listPersistedTenants: persistence.listPersistedTenants
};
