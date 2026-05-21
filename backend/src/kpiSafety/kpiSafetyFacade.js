'use strict';

const flags = require('../kpiRuntimeEnforcement/config/phaseZ5FeatureFlags');
const { validateKpiLeakage } = require('./kpiLeakageValidator');
const { validateKpiUnderdelivery } = require('./kpiUnderdeliveryValidator');
const { validateKpiAuthorityConflictValidator } = require('./kpiAuthorityConflictValidator');
const { validateKpiCrossDomain } = require('./kpiCrossDomainValidator');
const { logPhaseZ5 } = require('../kpiRuntimeEnforcement/phaseZ5Logger');

function getKpiSafetyStatus(ctx = {}) {
  return {
    phase: 'Z.5',
    layer: 'kpi-safety',
    validation: flags.isKpiSafetyValidationEnabled(),
    recommendation_only: !flags.isKpiRuntimeEnforcementEnabled(),
    tenant_id: ctx.tenant_id
  };
}

function validateKpiSafety(user = {}, kpis = [], ctx = {}) {
  const leakage = validateKpiLeakage(kpis, ctx);
  const underdelivery = validateKpiUnderdelivery(kpis, ctx);
  const authority = validateKpiAuthorityConflictValidator(user, kpis, ctx);
  const crossDomain = validateKpiCrossDomain(user, kpis, ctx);

  const safe =
    !underdelivery.critical_blocked &&
    authority.valid &&
    crossDomain.valid;

  if (!safe && flags.isKpiPilotObservabilityEnabled()) {
    logPhaseZ5('KPI_SAFETY_RISK', {
      tenant_id: ctx.tenant_id,
      leakage: leakage.leakage_detected,
      critical_underdelivery: underdelivery.critical,
      shadow_only: !flags.isKpiSafetyValidationEnabled()
    });
  }

  return {
    status: getKpiSafetyStatus(ctx),
    safe,
    leakage,
    underdelivery,
    authority,
    cross_domain: crossDomain,
    auto_remediate: false
  };
}

module.exports = { getKpiSafetyStatus, validateKpiSafety };
