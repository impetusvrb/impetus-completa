'use strict';

const flags = require('../runtimeGovernanceConsolidation/config/phaseZ10FeatureFlags');
const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const { assessTenantRuntimeMaturity } = require('./tenantRuntimeMaturity');
const { assessTenantOperationalReliability } = require('./tenantOperationalReliability');
const { assessTenantGovernanceConfidence } = require('./tenantGovernanceConfidence');

function runTenantGovernanceMaturityEngine(tenantId, user = {}, ctx = {}) {
  if (!tenantId) return { ready: false, reason: 'missing_tenant' };
  const pilot = isPilotTenant(tenantId) || ctx.force === true;
  if (!pilot) return { pilot: false, reason: 'not_pilot_tenant' };

  let pilotMaturity = { maturity_score: 0.5, kpi_channel_ready: false };
  try {
    pilotMaturity = require('../pilotMaturity/pilotMaturityFacade').assessPilotMaturity(tenantId, user, ctx);
  } catch {
    /* optional */
  }

  const runtime = assessTenantRuntimeMaturity(tenantId, ctx);
  const reliability = assessTenantOperationalReliability(ctx.stability_pack || {}, { tenant_id: tenantId });
  const maturity_score = Math.min(
    1,
    (pilotMaturity.maturity_score || 0.4) * 0.35 +
      runtime.runtime_maturity_score * 0.35 +
      reliability.reliability_score * 0.3
  );

  const confidence = assessTenantGovernanceConfidence(
    { maturity_score, reliability },
    { tenant_id: tenantId }
  );

  let convergence_maturity = 0.5;
  try {
    const kpi = ctx.kpi_governance_health?.health_score;
    const sum = ctx.summary_governance_health?.health_score;
    if (kpi != null || sum != null) {
      convergence_maturity = ((kpi ?? 0.5) + (sum ?? 0.5)) / (kpi != null && sum != null ? 2 : 1);
    }
  } catch {
    /* optional */
  }

  return {
    phase: 'Z.10',
    pilot: true,
    tenant_id: tenantId,
    enabled: flags.isTenantGovernanceMaturityEnabled(),
    maturity_score,
    governance_maturity: maturity_score,
    operational_reliability: reliability,
    convergence_maturity,
    runtime_sustainability: Math.min(1, maturity_score * 0.9 + convergence_maturity * 0.1),
    runtime: runtime,
    pilot_maturity: pilotMaturity,
    confidence,
    recommendation_only: !flags.isTenantGovernanceMaturityEnabled(),
    auto_remediate: false,
    chat_enforcement: false
  };
}

module.exports = { runTenantGovernanceMaturityEngine };
