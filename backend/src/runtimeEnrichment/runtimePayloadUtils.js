'use strict';

function extractKpiList(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.kpis || payload?.items || [];
}

function extractModules(payload) {
  return payload?.visible_modules || payload?.modules || payload?.contextual_modules?.modules || [];
}

function extractWidgets(payload) {
  return payload?.widgets || payload?.cards || payload?.dashboard_cards || [];
}

function extractInsights(payload) {
  return payload?.insights || payload?.operational_insights || payload?.smart_insights || [];
}

function countPresentSignals(ctx = {}) {
  let n = 0;
  if (ctx.precision_delivery) n++;
  if (ctx.contextual_delivery) n++;
  if (ctx.runtime_consistency) n++;
  if (ctx.kpi_governance || ctx.summary_governance) n++;
  if (ctx.chat_alignment) n++;
  return n;
}

module.exports = {
  extractKpiList,
  extractModules,
  extractWidgets,
  extractInsights,
  countPresentSignals
};
