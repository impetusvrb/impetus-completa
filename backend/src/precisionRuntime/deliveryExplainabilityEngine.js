'use strict';

const { traceDelivery } = require('./contextualDeliveryTrace');

function explainModule(moduleId, eligible, reason, confidence) {
  const text = eligible
    ? `Módulo "${moduleId}" entregue — confiança ${confidence} (${reason})`
    : `Módulo "${moduleId}" negado em entrega precisa — ${reason}`;
  traceDelivery('module', moduleId, eligible ? 'delivered' : 'denied', { reason, confidence });
  return { artifact: 'module', id: moduleId, eligible, reason, confidence, explanation: text };
}

function explainWidget(widgetId, eligible, reason) {
  const text = eligible
    ? `Widget "${widgetId}" no escopo contextual`
    : `Widget "${widgetId}" oculto (shadow) — ${reason}`;
  traceDelivery('widget', widgetId, eligible ? 'visible' : 'hidden', { reason });
  return { artifact: 'widget', id: widgetId, eligible, reason, explanation: text };
}

function explainKpi(kpiId, allowed, reason) {
  traceDelivery('kpi', kpiId, allowed ? 'allowed' : 'denied', { reason });
  return { artifact: 'kpi', id: kpiId, allowed, reason };
}

function explainSummary(available, reason) {
  traceDelivery('summary', 'smart-summary', available ? 'available' : 'unavailable', { reason });
  return { artifact: 'summary', available, reason };
}

function buildDeliveryExplainabilityReport(ctx = {}) {
  return {
    modules: ctx.modules || [],
    widgets: ctx.widgets || [],
    kpis: ctx.kpis || [],
    summary: ctx.summary || null,
    generated_at: new Date().toISOString()
  };
}

module.exports = {
  explainModule,
  explainWidget,
  explainKpi,
  explainSummary,
  buildDeliveryExplainabilityReport
};
