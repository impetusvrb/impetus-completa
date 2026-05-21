'use strict';

function traceInsightDelivery(input = {}, ctx = {}) {
  const insights = input.insights || [];
  return {
    insight_delivery_audit: {
      count: insights.length,
      sources: input.sources || ['personalizedInsightsService', 'dashboardKPIs'],
      domain_axis: ctx.domain_axis,
      generic_insights: insights.filter((i) => /sem volume|insuficiente|gerência/i.test(String(i.title || i.summary || ''))).length,
      leakage_detected: false
    },
    trace: [{ stage: 'insights_compose', source: 'personalizedInsightsService', execution_order: 1 }]
  };
}

module.exports = { traceInsightDelivery };
