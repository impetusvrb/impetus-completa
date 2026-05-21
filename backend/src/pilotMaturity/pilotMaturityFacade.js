'use strict';

const flags = require('./config/phaseZ4FeatureFlags');
const { runPilotTenantMaturityEngine } = require('./pilotTenantMaturityEngine');
const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');

function getPilotMaturityStatus(ctx = {}) {
  return {
    phase: 'Z.4',
    layer: 'pilot-maturity',
    maturity_engine: flags.isPilotMaturityEngineEnabled(),
    menu_stability: flags.isMenuStabilityAnalysisEnabled(),
    kpi_preparation: flags.isKpiEnforcementPreparationEnabled(),
    delivery_quality: flags.isDeliveryQualityAnalysisEnabled(),
    targeting_convergence: flags.isTargetingConvergenceValidationEnabled(),
    observability: flags.isPilotObservabilityEnabled(),
    kpi_enforcement_applied: false,
    recommendation_only: true,
    tenant_id: ctx.tenant_id
  };
}

function assessPilotMaturity(tenantId, user = {}, ctx = {}) {
  if (!tenantId) return { pilot: false, reason: 'missing_tenant' };
  if (!isPilotTenant(tenantId) && !ctx.force) {
    return { pilot: false, reason: 'not_pilot_tenant' };
  }
  return { pilot: true, ...runPilotTenantMaturityEngine(tenantId, user, ctx) };
}

function enrichWithPilotMaturity(tenantId, user, stabilizationPack = {}) {
  if (!isPilotTenant(tenantId) && !stabilizationPack.force) {
    return null;
  }
  return assessPilotMaturity(tenantId, user, stabilizationPack);
}

module.exports = {
  getPilotMaturityStatus,
  assessPilotMaturity,
  enrichWithPilotMaturity,
  runPilotTenantMaturityEngine
};
