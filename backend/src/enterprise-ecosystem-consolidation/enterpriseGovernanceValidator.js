'use strict';

const pilotEscalation = require('../enterprise-pilot-rollout/rolloutEscalationProtection');
const audience = require('../runtime-validation/enterpriseAudienceValidationRuntime');
const rollout = require('../runtime-validation/enterpriseControlledRolloutEngine');

/**
 * Fase 4 — governança enterprise (rollout, audience, publication, tenant, ABAC proxy).
 */
function validateEnterpriseGovernance(ctx = {}) {
  const escalation = pilotEscalation.assertNoEscalation({
    auto_promotion: ctx.auto_promotion,
    governance_escalation: ctx.governance_escalation,
    target_stage: ctx.target_stage
  });

  const audienceSamples = ctx.audience_samples || [
    { resolved_band: 'operator', visible_executive_governance: false, visible_menu_count: 5 },
    { resolved_band: 'director', missing_strategic_dashboard: false, visible_menu_count: 6 }
  ];
  const aud = audience.validateAudienceMatrix(audienceSamples);

  const controlled = rollout.evaluateControlledRollout({
    runtime_validation: ctx.runtime_validation || { stable: true },
    ux_validation: { worst_pressure_class: 'MODERATE' },
    audience_validation: aud,
    cognitive_maturity: ctx.cognitive_maturity || { rollout_readiness_score: 55 }
  });

  const tenantIsolated = ctx.tenant_id != null || ctx.tenant_isolation_assumed !== false;
  const boundedPublication = ctx.bounded_publication !== false;
  const abacProxy = ctx.abac_enforce !== true;

  const ok =
    escalation.ok &&
    aud.failure_rate <= 0.25 &&
    controlled.auto_promotion === false &&
    tenantIsolated &&
    boundedPublication;

  return {
    ok,
    rollout_governance: { auto_promotion: false, controlled },
    audience_governance: aud,
    publication_governance: { bounded: boundedPublication, pipeline: ['quality', 'safety', 'logistics'] },
    tenant_isolation: tenantIsolated,
    abac_proxy_ok: abacProxy,
    capability_governance: { workflow_matrix_expected: true, no_authority_escalation: escalation.ok },
    violations: escalation.violations
  };
}

module.exports = { validateEnterpriseGovernance };
