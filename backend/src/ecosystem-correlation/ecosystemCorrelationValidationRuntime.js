'use strict';

const runtime = require('../runtime-validation/enterpriseRuntimeValidationEngine');
const multi = require('../enterprise-shadow-stabilization/multiDomainPublicationValidator');
const escalation = require('../enterprise-pilot-rollout/rolloutEscalationProtection');

function ecosystemCorrelationValidationRuntime(pack) {
  const snap = runtime.validateEnterpriseRuntime();
  const pub = multi.validateMultiDomainPublication();
  const esc = escalation.assertNoEscalation({ auto_promotion: false, target_stage: 'full' });
  const issues = [];
  if (!pub.publication_stable) issues.push({ code: 'publication_unstable' });
  if (!snap.legacy_coexistence) issues.push({ code: 'legacy_coexistence_risk' });
  if (pack.telemetry?.telemetry_overload) issues.push({ code: 'telemetry_overload' });
  if (pack.consolidation?.controlled_rollout?.auto_promotion) issues.push({ code: 'auto_promotion_forbidden' });
  return {
    ok: issues.length === 0,
    issues,
    runtime_snapshot: snap,
    publication: pub,
    escalation_protection: esc,
    shadow_first: true,
    assistive_only: true
  };
}

module.exports = { ecosystemCorrelationValidationRuntime };
