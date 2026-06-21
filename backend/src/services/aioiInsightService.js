'use strict';

/**
 * EVENT-GOVERNANCE-12 — geração de insights cognitivos a partir de correlações governadas.
 * AIOI produz eventos; Governance decide distribuição.
 */

const { buildGovernedEventInsightDto, INSIGHT_TYPES } = require('../aioi/governedEventInsightDto');

const CATEGORY_TO_INSIGHT = Object.freeze({
  operational: 'INSIGHT_OPERATIONAL',
  quality: 'INSIGHT_QUALITY',
  sst: 'INSIGHT_SAFETY',
  safety: 'INSIGHT_SAFETY',
  esg: 'INSIGHT_ESG',
  billing: 'INSIGHT_FINANCIAL',
  executive: 'INSIGHT_EXECUTIVE',
  tpm: 'INSIGHT_OPERATIONAL',
  manuia: 'INSIGHT_OPERATIONAL',
  ai: 'INSIGHT_OPERATIONAL',
  dsr: 'INSIGHT_EXECUTIVE'
});

const CORRELATION_INSIGHT_HINT = Object.freeze({
  repetition: 'Padrão de repetição detectado',
  trend: 'Tendência de severidade crescente',
  anomaly: 'Anomalia de severidade isolada',
  recurrence: 'Recorrência de política de governança',
  escalating: 'Escalonamento progressivo',
  cross_domain: 'Correlação cross-domain'
});

function _resolveInsightType(categories, correlation) {
  if (correlation.kind === 'cross_domain' && correlation.domains) {
    const domains = correlation.domains.map((d) => String(d).toLowerCase());
    if (domains.includes('executive') || domains.includes('billing')) return 'INSIGHT_EXECUTIVE';
    if (domains.includes('esg') || domains.includes('sst')) return 'INSIGHT_ESG';
    if (domains.includes('quality')) return 'INSIGHT_QUALITY';
  }

  const cats = (categories || []).map((c) => String(c).toLowerCase());
  for (const cat of cats) {
    if (CATEGORY_TO_INSIGHT[cat]) return CATEGORY_TO_INSIGHT[cat];
  }
  return 'INSIGHT_OPERATIONAL';
}

function _confidenceForCorrelation(correlation) {
  const base = {
    repetition: 0.75,
    trend: 0.7,
    anomaly: 0.65,
    recurrence: 0.6,
    escalating: 0.8,
    cross_domain: 0.72
  };
  let c = base[correlation.kind] || 0.5;
  if (correlation.count >= 5) c = Math.min(0.95, c + 0.1);
  return c;
}

function _severityForInsight(correlation) {
  if (correlation.kind === 'escalating' || correlation.kind === 'anomaly') return 'high';
  if (correlation.kind === 'trend') return 'medium';
  if (correlation.kind === 'cross_domain') return 'medium';
  return 'medium';
}

/**
 * @param {object[]} events
 * @param {object[]} correlations
 * @returns {object[]}
 */
function generateInsights(events, correlations) {
  if (!Array.isArray(correlations) || correlations.length === 0) return [];

  const insights = [];

  for (const correlation of correlations) {
    const categories =
      correlation.categories ||
      correlation.domains ||
      (events || [])
        .filter((e) => correlation.eventIds?.includes(e.eventId))
        .map((e) => e.category);

    const insightType = _resolveInsightType(categories, correlation);
    const hint = CORRELATION_INSIGHT_HINT[correlation.kind] || 'Insight cognitivo';
    const maxEsc = (events || [])
      .filter((e) => correlation.eventIds?.includes(e.eventId))
      .reduce((m, e) => Math.max(m, e.escalationLevel || 0), 0);

    insights.push(
      buildGovernedEventInsightDto({
        eventType: `aioi_insight_${String(correlation.kind).replace(/[^a-z0-9_]/gi, '_')}`,
        policyId: 'AIOI_INSIGHT',
        severity: _severityForInsight(correlation),
        escalationLevel: maxEsc,
        sourceModule: 'aioiInsightService',
        correlationGroup: correlation.correlationGroup,
        insightType,
        confidence: _confidenceForCorrelation(correlation),
        title: `${insightType.replace('INSIGHT_', '')} — ${correlation.kind}`,
        message: `${hint} (${correlation.correlationGroup}). Eventos relacionados: ${(correlation.eventIds || []).length}.`,
        relatedEventIds: correlation.eventIds || [],
        correlationKind: correlation.kind
      })
    );
  }

  return insights;
}

/**
 * Deriva insights directamente de eventos (sem correlação explícita).
 * @param {object[]} events
 */
function generateInsightsFromEvents(events) {
  if (!events?.length) return [];
  const { detectCorrelations } = require('./aioiCorrelationService');
  return generateInsights(events, detectCorrelations(events));
}

module.exports = {
  INSIGHT_TYPES,
  CATEGORY_TO_INSIGHT,
  generateInsights,
  generateInsightsFromEvents
};
