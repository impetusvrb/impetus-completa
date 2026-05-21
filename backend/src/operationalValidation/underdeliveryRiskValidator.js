'use strict';

const { analyzeUnderdeliveryRisk } = require('../underdeliveryProtection/underdeliveryRiskAnalyzer');

function validateUnderdeliveryRisk(payload = {}, ctx = {}) {
  const modules = payload.visible_modules || payload.sidebar_governance_runtime?.final_visible_modules || [];
  const kpis = payload.kpis || [];
  const summaryText = String(payload.summary || payload.smart_summary || '');
  const base = analyzeUnderdeliveryRisk(modules, {
    ...ctx,
    canonical_identity: ctx.canonical_identity || { hierarchy_tier: ctx.hierarchy_tier }
  });

  const dashboardEmpty = modules.length === 0;
  const cockpitPreserved = modules.includes('dashboard') || modules.length >= 2;
  const kpiMinimum = kpis.length >= 1 || (ctx.kpi_optional === true);
  const summaryUseful = summaryText.length >= 20 || ctx.summary_optional === true;
  const contextualOk = (payload.contextual_modules || []).length <= (modules.length + 2);

  const excessivePruning = base.critical_underdelivery && modules.length <= 1;
  const operationalBlindness = !cockpitPreserved && ctx.hierarchy_tier !== 'executive';
  const executiveBlindness =
    ctx.hierarchy_tier === 'executive' && kpis.length === 0 && !summaryUseful;
  const cockpitCollapse = !modules.includes('dashboard') && modules.length < 2;

  let risk = 'low';
  if (excessivePruning || dashboardEmpty || cockpitCollapse) risk = 'high';
  else if (base.underdelivery_risk || operationalBlindness) risk = 'medium';

  return {
    underdelivery_risk: risk,
    dashboard_empty: dashboardEmpty,
    cockpit_preserved: cockpitPreserved,
    kpi_minimum_present: kpiMinimum,
    summary_useful: summaryUseful,
    contextual_operational: contextualOk,
    excessive_pruning: excessivePruning,
    operational_blindness: operationalBlindness,
    executive_blindness: executiveBlindness,
    cockpit_collapse: cockpitCollapse,
    empty_runtime: dashboardEmpty && !kpiMinimum && !summaryUseful,
    fabricated_data: false,
    analyzer: base
  };
}

module.exports = { validateUnderdeliveryRisk };
