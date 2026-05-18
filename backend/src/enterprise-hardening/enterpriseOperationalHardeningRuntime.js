'use strict';

const telemetry = require('./enterpriseTelemetryHardening');
const edge = require('./enterpriseEdgeHardening');
const tenant = require('./enterpriseTenantHardening');
const cognitive = require('./enterpriseCognitiveHardening');
const observability = require('./enterpriseObservabilityHardening');
const maturity = require('./enterpriseMaturityConsolidation');
const continuity = require('./enterpriseContinuity');
const ecosystem = require('../enterprise-ecosystem-consolidation/enterpriseEcosystemRuntimeValidator');
const correlation = require('../ecosystem-correlation/ecosystemCorrelationRuntime');
const metrics = require('./enterpriseHardeningMetrics');
const validation = require('./enterpriseResilienceValidationRuntime');

function enterpriseRuntimeResilienceRuntime(pack) {
  const checks = [
    pack.telemetry?.ok,
    pack.edge?.ok,
    pack.tenant?.ok,
    pack.cognitive?.ok,
    pack.observability?.ok,
    pack.continuity?.ok
  ];
  const score = checks.filter(Boolean).length / checks.length;
  return { score, resilient: score >= 0.75, checks_passed: checks.filter(Boolean).length };
}

function enterpriseContextualScalabilityRuntime(ctx = {}) {
  const domains = Number(ctx.active_domains) || 4;
  const tenants = Number(ctx.active_tenants) || 1;
  const scalable = domains <= 6 && tenants <= 500;
  return { scalable, domains, tenants, contextual_scalability_safe: scalable };
}

function enterpriseOperationalPressureRuntime(pack) {
  const t = pack.telemetry?.resilience?.telemetry_pressure_score || 0;
  const c = pack.cognitive?.maturity?.contextual_overload_score || 0;
  return { score: Math.max(t, c / 100), elevated: t > 0.75 || c > 55 };
}

function enterpriseOperationalHardeningRuntime(reqBody = {}) {
  const t0 = Date.now();
  const tenantId = reqBody.tenant_id || null;
  const ctx = reqBody.hardening_context || reqBody;

  const telemetryPack = telemetry.enterpriseTelemetryHardeningRuntime({ ...ctx, tenant_id: tenantId });
  const edgePack = edge.enterpriseEdgeHardeningRuntime(ctx);
  const tenantPack = tenant.enterpriseTenantHardeningRuntime({ ...ctx, tenant_id: tenantId });
  const cognitivePack = cognitive.enterpriseCognitiveHardeningRuntime(ctx);
  const observabilityPack = observability.enterpriseObservabilityHardeningRuntime(ctx);
  const scalability = enterpriseContextualScalabilityRuntime(ctx);

  const subPack = { telemetry: telemetryPack, edge: edgePack, tenant: tenantPack, cognitive: cognitivePack, observability: observabilityPack };
  const continuityPack = continuity.enterpriseIndustrialContinuityRuntime(subPack);
  const runtimeResilience = enterpriseRuntimeResilienceRuntime({ ...subPack, continuity: continuityPack });
  const maturityPack = maturity.enterpriseMaturityConsolidationRuntime({ ...subPack, continuity: continuityPack, runtime_resilience: runtimeResilience });

  let ecosystemRuntime = { stable: true, skipped: true };
  let ecosystemCorrelation = { ok: true, skipped: true };
  try {
    ecosystemRuntime = ecosystem.validateEcosystemRuntime({ tenant_id: tenantId, ...reqBody });
    ecosystemCorrelation = correlation.ecosystemCorrelationRuntime({ tenant_id: tenantId, ...reqBody });
  } catch (_e) {
    /* optional */
  }

  const operationalPressure = enterpriseOperationalPressureRuntime(subPack);

  const pack = {
    ok: runtimeResilience.resilient && continuityPack.ok,
    framework: 'enterprise_operational_hardening',
    tenant_id: tenantId,
    generated_at: new Date().toISOString(),
    telemetry: telemetryPack,
    edge: edgePack,
    tenant: tenantPack,
    cognitive: cognitivePack,
    observability: observabilityPack,
    continuity: continuityPack,
    scalability,
    runtime_resilience: runtimeResilience,
    maturity: maturityPack,
    ecosystem_runtime: ecosystemRuntime,
    ecosystem_correlation: ecosystemCorrelation,
    enterprise_operational_pressure_score: operationalPressure.score,
    enterprise_cross_domain_readiness: ecosystemRuntime.stable ? 1 : 0.5,
    observation_cycle: {
      pm2_check_recommended: true,
      duration_minutes: reqBody.observation_minutes || 15,
      shadow_first: true
    },
    rollout_governance: {
      auto_promotion: false,
      full_rollout: false,
      manual_only: true,
      shadow_first: true
    },
    enterprise_hardening_runtime_ms: Date.now() - t0,
    assistive_only: true,
    enforcement: false
  };

  pack.validation = validation.enterpriseResilienceValidationRuntime(pack);
  metrics.recordEnterpriseHardeningMetrics(tenantId, pack);
  return pack;
}

module.exports = {
  enterpriseOperationalHardeningRuntime,
  enterpriseRuntimeResilienceRuntime,
  enterpriseContextualScalabilityRuntime,
  enterpriseOperationalPressureRuntime,
  enterpriseCognitivePressureRuntime: cognitive.enterpriseCognitivePressureRuntime,
  enterpriseIndustrialContinuityRuntime: continuity.enterpriseIndustrialContinuityRuntime
};
