'use strict';

/**
 * M1.3 — Analytics Event Catalog
 * Bounded context: industrial_analytics
 * READ ONLY / NO AUTO ACTION
 */

const ANALYTICS_EVENTS = Object.freeze([
  { type: 'analytics.kpi.generated', domain: 'analytics', critical: false, version: 1, description: 'KPI calculado e registrado' },
  { type: 'analytics.trend.detected', domain: 'analytics', critical: false, version: 1, description: 'Tendência detectada' },
  { type: 'analytics.forecast.generated', domain: 'analytics', critical: false, version: 1, description: 'Previsão gerada' },
  { type: 'analytics.aggregation.completed', domain: 'analytics', critical: false, version: 1, description: 'Agregação histórica concluída' },
  { type: 'analytics.anomaly.detected', domain: 'analytics', critical: true, version: 1, description: 'Anomalia estatística detectada' },
  { type: 'analytics.threshold.breached', domain: 'analytics', critical: true, version: 1, description: 'Limiar de KPI ultrapassado' },
  { type: 'analytics.report.generated', domain: 'analytics', critical: false, version: 1, description: 'Relatório analítico gerado' }
]);

const _byType = new Map(ANALYTICS_EVENTS.map((e) => [e.type, e]));

function getAnalyticsEvent(type) {
  return _byType.get(String(type || '').trim().toLowerCase()) || null;
}

function listAnalyticsEvents() {
  return [...ANALYTICS_EVENTS];
}

module.exports = { ANALYTICS_EVENTS, getAnalyticsEvent, listAnalyticsEvents };
