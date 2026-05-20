'use strict';

const { compareLegacyVsPrecise } = require('./runtimePrecisionComparator');
const { getDeliveryTelemetry } = require('./runtimeDeliveryTelemetry');

function validatePrecisionRuntime(legacyPayload, precisePayload, ctx = {}) {
  const moduleCmp = compareLegacyVsPrecise(legacyPayload, precisePayload?.modules || precisePayload);
  const telemetry = getDeliveryTelemetry();

  const issues = [];
  if (moduleCmp.overdelivery.length) {
    issues.push({ severity: 'high', type: 'overdelivery', items: moduleCmp.overdelivery });
  }
  if (moduleCmp.underdelivery.length) {
    issues.push({ severity: 'medium', type: 'underdelivery', items: moduleCmp.underdelivery });
  }

  const delivery_precision_score = moduleCmp.match
    ? 0.95
    : Number(Math.max(0.4, 1 - moduleCmp.delivery_mismatch * 0.08).toFixed(4));

  return {
    valid: issues.filter((i) => i.severity === 'critical').length === 0,
    issues,
    comparison: moduleCmp,
    delivery_precision_score,
    telemetry_snapshot: telemetry,
    shadow_mode: ctx.shadow_mode !== false,
    expected_vs_delivered: {
      expected_modules: precisePayload?.precise_modules,
      delivered_modules: legacyPayload?.visible_modules
    }
  };
}

module.exports = { validatePrecisionRuntime };
