'use strict';

function assessKpiActivationSafety(ctx = {}) {
  const enforcement = ctx.kpi_runtime_enforcement;
  const safe = !enforcement || enforcement.enforcement_applied !== true || enforcement.narrative_fabricated !== true;
  return { kpi_safe: safe, enforcement_active: enforcement?.enforcement_applied === true, recommendation_only: true };
}

module.exports = { assessKpiActivationSafety };
