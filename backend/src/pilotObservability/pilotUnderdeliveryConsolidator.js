'use strict';

function consolidatePilotUnderdelivery(ctx = {}) {
  const menu = ctx.underdelivery || ctx.menu_underdelivery;
  const kpi = ctx.kpi_preparation?.underdelivery;
  return {
    menu_critical: menu?.risk?.critical_underdelivery === true,
    kpi_simulated_critical: kpi?.critical === true,
    kpi_minimum: kpi?.minimum_required,
    consolidated_at: new Date().toISOString()
  };
}

module.exports = { consolidatePilotUnderdelivery };
