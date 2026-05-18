'use strict';

const { clamp01 } = require('./shared/hardeningHelpers');

function enterpriseMetricCardinalityProtection(ctx = {}) {
  const cardinality = Number(ctx.distinct_metric_keys) || 0;
  const cap = Number(ctx.cap) || 800;
  return {
    cardinality_explosion: cardinality > cap,
    cardinality,
    capped: cardinality > cap,
    action: cardinality > cap ? 'aggregate_or_drop' : 'none'
  };
}

function enterpriseObservabilityPressureRuntime(ctx = {}) {
  const rate = Number(ctx.metrics_per_min) || 0;
  const pressure = clamp01(rate / 2000);
  return { observability_pressure: pressure, overload: pressure > 0.8 };
}

function enterpriseObservabilityHardeningRuntime(ctx = {}) {
  const cardinality = enterpriseMetricCardinalityProtection(ctx);
  const pressure = enterpriseObservabilityPressureRuntime(ctx);
  return {
    ok: !cardinality.cardinality_explosion && !pressure.overload,
    cardinality,
    pressure,
    adaptive_retention: true,
    wave2_integrated: true,
    assistive_only: true
  };
}

module.exports = {
  enterpriseObservabilityHardeningRuntime,
  enterpriseMetricCardinalityProtection,
  enterpriseObservabilityPressureRuntime
};
