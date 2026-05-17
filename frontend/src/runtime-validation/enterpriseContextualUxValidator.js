const BAND_RULES = {
  operator: { max_menu: 6, max_depth: 3, max_clicks: 12 },
  technician: { max_menu: 10, max_depth: 4, max_clicks: 18 },
  supervisor: { max_menu: 11, max_depth: 4, max_clicks: 20 },
  coordinator: { max_menu: 12, max_depth: 5, max_clicks: 22 },
  manager: { max_menu: 10, max_depth: 4, max_clicks: 18 },
  director: { max_menu: 8, max_depth: 4, max_clicks: 15 },
  auditor: { max_menu: 10, max_depth: 5, max_clicks: 20 },
  production: { max_menu: 2, max_depth: 2, max_clicks: 6 }
};

export function classifyUxPressure(issueCount, abandon = 0) {
  const score = issueCount * 25 + Math.round(abandon * 50);
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MODERATE';
  return 'LOW';
}

export function validateEnterpriseContextualUx(input = {}) {
  const band = String(input.band || 'production');
  const rules = BAND_RULES[band] || BAND_RULES.production;
  const issues = [];
  const menu = Number(input.menu_item_count) || 0;
  const depth = Number(input.navigation_depth) || 0;
  const clicks = Number(input.click_density) || 0;
  const abandon = Number(input.abandonment_rate) || 0;
  if (menu > rules.max_menu) issues.push('menu_saturation');
  if (depth > rules.max_depth) issues.push('excessive_navigation');
  if (clicks > rules.max_clicks) issues.push('operational_friction');
  if (abandon > 0.35) issues.push('workflow_fatigue');
  const uxScore = Math.max(0, 100 - issues.length * 18);
  return {
    band,
    ux_score: uxScore,
    ux_pressure_class: classifyUxPressure(issues.length, abandon),
    acceptable: uxScore >= 65,
    issues
  };
}
