'use strict';

const { resolveContextualDashboard } = require('./contextualDashboardResolver');

function composeGovernedDashboard(widgets = [], user, ctx = {}) {
  const profile = resolveContextualDashboard(user, ctx);
  const list = Array.isArray(widgets) ? widgets : [];
  const scored = list.map((w) => {
    const domain = w?.domain || w?.meta?.domain;
    const match = !domain || domain === '*' || domain === 'shared' || domain === ctx.domain;
    return { widget: w, allowed: match, reason: match ? 'domain_match' : 'widget_domain_mismatch' };
  });
  const eligible = scored.filter((s) => s.allowed);
  return {
    profile,
    widgets: eligible.map((s) => s.widget),
    denied: scored.filter((s) => !s.allowed),
    dashboard_targeting_precision: list.length ? eligible.length / list.length : 1
  };
}

module.exports = { composeGovernedDashboard };
