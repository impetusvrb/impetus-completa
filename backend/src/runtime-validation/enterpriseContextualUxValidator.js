'use strict';

const BAND_RULES = Object.freeze({
  operator: { max_menu: 6, max_depth: 3, max_clicks: 12, max_dashboards: 2 },
  technician: { max_menu: 10, max_depth: 4, max_clicks: 18, max_dashboards: 4 },
  supervisor: { max_menu: 11, max_depth: 4, max_clicks: 20, max_dashboards: 5 },
  coordinator: { max_menu: 12, max_depth: 5, max_clicks: 22, max_dashboards: 6 },
  manager: { max_menu: 10, max_depth: 4, max_clicks: 18, max_dashboards: 6 },
  director: { max_menu: 8, max_depth: 4, max_clicks: 15, max_dashboards: 8 },
  auditor: { max_menu: 10, max_depth: 5, max_clicks: 20, max_dashboards: 4 },
  production: { max_menu: 2, max_depth: 2, max_clicks: 6, max_dashboards: 1 }
});

function classifyUxPressure(issueCount, abandon) {
  const score = issueCount * 25 + Math.round((abandon || 0) * 50);
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MODERATE';
  return 'LOW';
}

/**
 * @param {object} input
 */
function validateContextualUx(input) {
  const band = String(input.band || input.audience_band || 'production');
  const rules = BAND_RULES[band] || BAND_RULES.production;
  const issues = [];
  const menu = Number(input.menu_item_count) || 0;
  const depth = Number(input.navigation_depth) || 0;
  const clicks = Number(input.click_density) || Number(input.interaction_density) || 0;
  const dashboards = Number(input.dashboard_count) || 0;
  const abandon = Number(input.abandonment_rate) || Number(input.route_abandonment_rate) || 0;

  if (menu > rules.max_menu) issues.push({ code: 'menu_saturation', band, menu, limit: rules.max_menu });
  if (depth > rules.max_depth) issues.push({ code: 'excessive_navigation', band, depth, limit: rules.max_depth });
  if (clicks > rules.max_clicks) issues.push({ code: 'operational_friction', band, clicks, limit: rules.max_clicks });
  if (dashboards > rules.max_dashboards) issues.push({ code: 'dashboard_overload', band, dashboards, limit: rules.max_dashboards });
  if (abandon > 0.35) issues.push({ code: 'workflow_fatigue', band, abandon });
  if (menu > rules.max_menu * 1.5) issues.push({ code: 'visual_overload', band, severity: 'high' });

  const uxScore = Math.max(0, 100 - issues.length * 18 - Math.round(abandon * 35));
  const pressure = classifyUxPressure(issues.length, abandon);

  return {
    ok: true,
    band,
    ux_score: uxScore,
    acceptable: uxScore >= 65 && pressure !== 'CRITICAL',
    ux_pressure_class: pressure,
    issues,
    decision_density_high: clicks > rules.max_clicks * 0.9
  };
}

function validateMultiProfile(profiles) {
  if (!Array.isArray(profiles)) return { ok: false, error: 'profiles_required' };
  const results = profiles.map((p) => validateContextualUx(p));
  const worst = results.reduce((w, r) => {
    const order = { LOW: 0, MODERATE: 1, HIGH: 2, CRITICAL: 3 };
    return order[r.ux_pressure_class] > order[w] ? r.ux_pressure_class : w;
  }, 'LOW');
  return { ok: true, worst_pressure_class: worst, results };
}

module.exports = {
  BAND_RULES,
  validateContextualUx,
  validateMultiProfile,
  classifyUxPressure
};
