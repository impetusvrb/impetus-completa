'use strict';

const escalation = require('../enterprise-pilot-rollout/rolloutEscalationProtection');

function enterpriseResilienceValidationRuntime(pack) {
  const issues = [];
  if (pack.telemetry?.overload?.overload) issues.push({ code: 'telemetry_overload' });
  if (pack.edge?.reconnect?.reconnect_storm) issues.push({ code: 'edge_reconnect_storm' });
  if (pack.cognitive?.maturity?.cognitive_overload) issues.push({ code: 'cognitive_overload' });
  if (pack.observability?.cardinality?.cardinality_explosion) issues.push({ code: 'metric_cardinality_explosion' });
  if (pack.continuity?.fragmentation_detected) issues.push({ code: 'continuity_fragmentation' });
  const esc = escalation.assertNoEscalation({ auto_promotion: false, target_stage: 'full' });
  if (!esc.blocked && pack.rollout_governance?.auto_promotion) issues.push({ code: 'auto_promotion_forbidden' });
  return {
    ok: issues.length === 0,
    issues,
    shadow_first: true,
    escalation_protection: esc,
    assistive_only: true
  };
}

module.exports = { enterpriseResilienceValidationRuntime };
