'use strict';

/**
 * SafetyContextualUxValidator — avalia adequação UX por audiência (heurísticas bounded).
 */

const BAND_RULES = Object.freeze({
  operator: {
    max_menu_items: 6,
    max_navigation_depth: 3,
    max_click_density: 12,
    mobile_first: true,
    expect_linear_flow: true
  },
  sst_technician: {
    max_menu_items: 10,
    max_navigation_depth: 4,
    max_click_density: 18,
    hybrid_operational_governance: true
  },
  coordinator: {
    max_menu_items: 12,
    max_navigation_depth: 5,
    max_click_density: 22,
    tactical_density: true
  },
  director: {
    max_menu_items: 8,
    max_navigation_depth: 4,
    max_click_density: 15,
    executive_dashboards: true
  },
  auditor: {
    max_menu_items: 10,
    max_navigation_depth: 5,
    max_click_density: 20,
    audit_density: true
  },
  production: {
    max_menu_items: 2,
    max_navigation_depth: 2,
    max_click_density: 6,
    widgets_only: true
  }
});

/**
 * @param {object} input
 * @param {string} input.band
 * @param {number} [input.menu_item_count]
 * @param {number} [input.navigation_depth]
 * @param {number} [input.click_density]
 * @param {number} [input.abandonment_rate]
 */
function validateContextualUx(input) {
  const band = String(input.band || 'production');
  const rules = BAND_RULES[band] || BAND_RULES.production;
  const issues = [];
  const menuCount = Number(input.menu_item_count) || 0;
  const depth = Number(input.navigation_depth) || 0;
  const clicks = Number(input.click_density) || 0;
  const abandon = Number(input.abandonment_rate) || 0;

  if (menuCount > rules.max_menu_items) {
    issues.push({ code: 'menu_overflow', severity: 'medium', band, menuCount, limit: rules.max_menu_items });
  }
  if (depth > rules.max_navigation_depth) {
    issues.push({ code: 'depth_excess', severity: 'medium', band, depth, limit: rules.max_navigation_depth });
  }
  if (clicks > rules.max_click_density) {
    issues.push({ code: 'click_density_high', severity: 'high', band, clicks, limit: rules.max_click_density });
  }
  if (abandon > 0.35) {
    issues.push({ code: 'abandonment_high', severity: 'high', band, abandon });
  }

  const score = Math.max(0, 100 - issues.length * 22 - Math.round(abandon * 40));
  return {
    ok: true,
    band,
    ux_score: score,
    acceptable: score >= 65 && !issues.some((i) => i.severity === 'high'),
    issues,
    rules_applied: rules
  };
}

function validateMultiProfile(profiles) {
  if (!Array.isArray(profiles)) return { ok: false, error: 'profiles_required' };
  return {
    ok: true,
    results: profiles.map((p) => validateContextualUx(p))
  };
}

module.exports = {
  BAND_RULES,
  validateContextualUx,
  validateMultiProfile
};
