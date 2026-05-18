'use strict';

function environmentOperationalErgonomicsValidator(profile = {}) {
  const clicks = Number(profile.click_density) || 0;
  const depth = Number(profile.navigation_depth) || 0;
  const menus = Number(profile.menu_item_count) || 0;
  const issues = [];
  if (clicks > 22) issues.push({ code: 'excess_clicks' });
  if (depth > 5) issues.push({ code: 'deep_navigation' });
  if (menus > 12) issues.push({ code: 'menu_overload' });
  const score = Math.max(0, 100 - issues.length * 18 - Math.max(0, clicks - 12) * 2);
  return {
    acceptable: issues.length === 0 && score >= 55,
    ergonomics_score: score,
    issues,
    band: profile.band || 'operator'
  };
}

function environmentExecutiveErgonomicsValidator(profile = {}) {
  const kpis = Number(profile.kpi_count) || 0;
  const widgets = Number(profile.dashboard_widget_count) || 0;
  const issues = [];
  if (kpis > 10) issues.push({ code: 'executive_kpi_overload' });
  if (widgets > 8) issues.push({ code: 'executive_widget_overload' });
  const score = Math.max(0, 100 - issues.length * 20);
  return { acceptable: issues.length === 0, ergonomics_score: score, issues, band: profile.band || 'director' };
}

function environmentNavigationErgonomicsValidator(ctx = {}) {
  const depth = Number(ctx.operational_navigation_depth) || 0;
  return {
    acceptable: depth <= 4,
    navigation_depth: depth,
    contextual_navigation_score: Math.max(0, 1 - depth / 6)
  };
}

function environmentTelemetryErgonomicsValidator(ctx = {}) {
  const density = Number(ctx.telemetry_density_score) || 0;
  return { acceptable: density <= 0.75, telemetry_density_score: density };
}

function environmentCognitiveErgonomicsValidator(ctx = {}) {
  const pressure = Number(ctx.cognitive_pressure_score) || 0;
  return { acceptable: pressure <= 0.72, cognitive_pressure_score: pressure };
}

function environmentOperationalErgonomicsRuntime(profiles = []) {
  const list = profiles.length
    ? profiles
    : [
        { band: 'operator', menu_item_count: 5, navigation_depth: 2, click_density: 8 },
        { band: 'technician', menu_item_count: 7, navigation_depth: 3, click_density: 12 },
        { band: 'coordinator', menu_item_count: 9, navigation_depth: 3, click_density: 14 },
        { band: 'director', kpi_count: 6, dashboard_widget_count: 5 }
      ];
  const operational = list
    .filter((p) => p.band !== 'director')
    .map((p) => environmentOperationalErgonomicsValidator(p));
  const executive = list
    .filter((p) => p.band === 'director')
    .map((p) => environmentExecutiveErgonomicsValidator(p));
  const avg =
    [...operational, ...executive].reduce((s, r) => s + (r.ergonomics_score || 0), 0) /
    Math.max(1, operational.length + executive.length);
  return {
    acceptable: operational.every((r) => r.acceptable) && executive.every((r) => r.acceptable),
    ergonomics_score: Math.round(avg),
    operational,
    executive
  };
}

module.exports = {
  environmentOperationalErgonomicsValidator,
  environmentExecutiveErgonomicsValidator,
  environmentNavigationErgonomicsValidator,
  environmentTelemetryErgonomicsValidator,
  environmentCognitiveErgonomicsValidator,
  environmentOperationalErgonomicsRuntime
};
