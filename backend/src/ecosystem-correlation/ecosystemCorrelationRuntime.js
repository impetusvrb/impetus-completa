'use strict';

const cross = require('./ecosystemCrossDomainRuntime');
const operational = require('./ecosystemOperationalCorrelationRuntime');
const telemetry = require('./ecosystemTelemetryCorrelationRuntime');
const executive = require('./ecosystemExecutiveCorrelationRuntime');
const maturity = require('./ecosystemMaturityCorrelationRuntime');
const behavior = require('./ecosystemOperationalBehaviorCorrelationRuntime');
const validation = require('./ecosystemCorrelationValidationRuntime');
const consolidation = require('./ecosystemOperationalConsolidationRuntime');
const metrics = require('./ecosystemCorrelationMetricsRuntime');

function ecosystemCorrelationRuntime(reqBody = {}) {
  const t0 = Date.now();
  const tenantId = reqBody.tenant_id || null;
  const ctx = reqBody.signals || reqBody;

  const crossDomain = cross.ecosystemCrossDomainRuntime(ctx);
  const operationalCorr = operational.ecosystemOperationalCorrelationRuntime(ctx);
  const telemetryCorr = telemetry.ecosystemTelemetryCorrelationRuntime(ctx.telemetry || ctx);
  const maturityCorr = maturity.ecosystemMaturityCorrelationRuntime(ctx);
  const behaviorCorr = behavior.ecosystemOperationalBehaviorCorrelationRuntime(tenantId, ctx);
  const executiveCorr = executive.ecosystemExecutiveCorrelationRuntime({
    domain_pairs: crossDomain.domain_pairs
  });
  const consolidate = consolidation.ecosystemOperationalConsolidationRuntime({
    ...reqBody,
    tenant_id: tenantId
  });
  const stability = consolidation.ecosystemCrossDomainStabilityRuntime();
  const cognitivePressure = consolidation.ecosystemCognitivePressureRuntime(ctx);

  const pack = {
    ok: true,
    framework: 'ecosystem_correlation',
    tenant_id: tenantId,
    generated_at: new Date().toISOString(),
    domains: ['quality', 'safety', 'logistics', 'environment', 'production', 'maintenance', 'energy'],
    cross_domain: crossDomain,
    operational: operationalCorr,
    telemetry: telemetryCorr,
    maturity: maturityCorr,
    behavior: behaviorCorr,
    executive: executiveCorr,
    consolidation: consolidate,
    stability,
    cognitive_pressure: cognitivePressure,
    ecosystem_correlation_runtime_ms: Date.now() - t0,
    ecosystem_cross_domain_density_score: crossDomain.ecosystem_cross_domain_density_score,
    ecosystem_operational_pressure_score: operationalCorr.ecosystem_operational_pressure_score,
    ecosystem_cross_domain_readiness: stability.ok && consolidate.consolidation_stable ? 1 : 0.5,
    shadow_first: true,
    auto_promotion: false,
    assistive_only: true,
    enforcement: false
  };

  pack.validation = validation.ecosystemCorrelationValidationRuntime(pack);
  metrics.recordEcosystemCorrelationMetrics(tenantId, pack);
  return pack;
}

module.exports = { ecosystemCorrelationRuntime };
