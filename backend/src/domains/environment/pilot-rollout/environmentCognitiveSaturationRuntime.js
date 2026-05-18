'use strict';

function environmentCognitivePressureRuntime(ctx = {}) {
  const menu = Number(ctx.menu_count) || 0;
  const views = Number(ctx.view_count) || 0;
  const widgets = Number(ctx.dashboard_widget_count) || 0;
  const score = Math.min(1, (menu / 14) * 0.4 + (views / 8) * 0.3 + (widgets / 12) * 0.3);
  return {
    cognitive_pressure_score: score,
    saturation_risk: score > 0.75,
    protect: score > 0.85
  };
}

function environmentOperationalSaturationRuntime(ctx = {}) {
  const p = environmentCognitivePressureRuntime(ctx);
  return {
    operational_saturation_score: p.cognitive_pressure_score,
    operational_overload: p.saturation_risk,
    saturation_collapse_risk: p.cognitive_pressure_score > 0.88
  };
}

function environmentExecutiveSaturationRuntime(ctx = {}) {
  const kpis = Number(ctx.kpi_count) || 0;
  const score = Math.min(1, kpis / 12);
  return { executive_density_score: score, executive_overload: score > 0.7 };
}

function environmentNavigationDensityRuntime(ctx = {}) {
  const count = Number(ctx.menu_count) || 0;
  return {
    environment_navigation_density_score: Math.min(1, count / 14),
    sidebar_overload: count > 12
  };
}

function environmentDashboardDensityRuntime(ctx = {}) {
  const w = Number(ctx.widget_count) || 0;
  return { dashboard_density: Math.min(1, w / 10), dashboard_overload: w > 8 };
}

function runEnvironmentCognitiveSaturationPack(ctx = {}) {
  const pressure = environmentCognitivePressureRuntime(ctx);
  const operational = environmentOperationalSaturationRuntime(ctx);
  const executive = environmentExecutiveSaturationRuntime(ctx);
  const nav = environmentNavigationDensityRuntime(ctx);
  const dash = environmentDashboardDensityRuntime(ctx);
  const ok = !operational.saturation_collapse_risk && !nav.sidebar_overload && !dash.dashboard_overload;
  return { ok, pressure, operational, executive, navigation: nav, dashboard: dash };
}

module.exports = {
  environmentCognitivePressureRuntime,
  environmentOperationalSaturationRuntime,
  environmentExecutiveSaturationRuntime,
  environmentNavigationDensityRuntime,
  environmentDashboardDensityRuntime,
  runEnvironmentCognitiveSaturationPack
};
