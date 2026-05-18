'use strict';

const cognitive = require('../runtime-validation/enterpriseCognitiveMaturityEngine');
const ecmi = require('../enterprise-ecosystem-consolidation/enterpriseCognitiveMaturityIndex');

function enterpriseExecutiveDensityProtection(ctx = {}) {
  const kpis = Number(ctx.kpi_count) || 0;
  const widgets = Number(ctx.dashboard_widget_count) || 0;
  return {
    executive_overload: kpis > 10 || widgets > 8,
    protected: kpis <= 10 && widgets <= 8
  };
}

function enterpriseOperationalDensityProtection(ctx = {}) {
  const menu = Number(ctx.menu_count) || 0;
  return { operational_overload: menu > 12, sidebar_collapse_risk: menu > 14 };
}

function enterpriseContextualFusionProtection(ctx = {}) {
  const domains = Number(ctx.active_domain_count) || 4;
  return { fusion_safe: domains <= 6, domains };
}

function enterpriseCognitiveHardeningRuntime(ctx = {}) {
  const mat = cognitive.analyzeCognitiveMaturity(ctx);
  const index = ecmi.computeEnterpriseCognitiveMaturityIndex(ctx);
  const exec = enterpriseExecutiveDensityProtection(ctx);
  const op = enterpriseOperationalDensityProtection(ctx);
  const fusion = enterpriseContextualFusionProtection(ctx);
  return {
    ok: !mat.cognitive_overload && exec.protected && !op.operational_overload,
    maturity: mat,
    ecmi: index,
    executive: exec,
    operational: op,
    fusion,
    saturation_protected: !mat.cognitive_overload,
    assistive_only: true
  };
}

function enterpriseCognitivePressureRuntime(ctx = {}) {
  const pack = enterpriseCognitiveHardeningRuntime(ctx);
  return {
    score: pack.maturity?.contextual_overload_score / 100 || 0,
    overload: pack.maturity?.cognitive_overload === true
  };
}

module.exports = {
  enterpriseCognitiveHardeningRuntime,
  enterpriseCognitivePressureRuntime,
  enterpriseExecutiveDensityProtection,
  enterpriseOperationalDensityProtection,
  enterpriseContextualFusionProtection
};
