/**
 * CERT-PULSE-04 FASE 8 — Explainability avançada (fatores +/-, tendências, eventos).
 */
'use strict';

const db = require('../../../db');
const perceptionLayer = require('../perceptionLayer');
const { correlateHumanSignals } = require('../humanCorrelationEngine');
const { computePulseIndex } = require('../indexCalculator');
const { buildExplainability } = require('../explainability');
const { analyzeTemporalLearning } = require('../temporalLearning');
const { DIMENSIONS } = require('../constants');

function classifyFactor(ind) {
  const v = parseFloat(ind.value) || 0;
  const key = ind.key;
  let impact = 'neutral';

  if (key === 'absence_rate' && v > 0.1) impact = 'negative';
  else if (key === 'overtime_minutes' && v > 600) impact = 'negative';
  else if (['tpm_incidents', 'proacao_proposals', 'intelligent_registrations'].includes(key) && v >= 3)
    impact = 'positive';
  else if (key === 'tasks_completed' && v >= 4) impact = 'positive';
  else if (key === 'tenure_days' && v > 365) impact = 'positive';
  else if (v === 0 && ['tpm_incidents', 'proacao_proposals'].includes(key)) impact = 'negative';

  return impact;
}

async function loadRecentEvents(companyId, userId, days = 30) {
  try {
    const r = await db.query(
      `
      SELECT event_type, event_source, created_at, payload
      FROM pulse_cognitive_events
      WHERE company_id = $1 AND user_id = $2
        AND created_at >= now() - ($3::int || ' days')::interval
      ORDER BY created_at DESC LIMIT 15
    `,
      [companyId, userId, days]
    );
    return r.rows || [];
  } catch (_) {
    return [];
  }
}

async function buildAdvancedExplainability(companyId, userId, teamMemberId) {
  const perception = await perceptionLayer.buildOrganizationalPerception(companyId, {
    userId,
    teamMemberId
  });
  if (!perception.ok) return perception;

  const correlationPack = correlateHumanSignals(perception);
  const indexPack = computePulseIndex(perception, correlationPack);
  const temporalPack = await analyzeTemporalLearning(companyId, { userId, teamMemberId });
  const base = buildExplainability(indexPack, perception, correlationPack, temporalPack);

  const indicators = indexPack.indicators_used || [];
  const positive_factors = indicators
    .filter((ind) => classifyFactor(ind) === 'positive')
    .map((ind) => ({ ...ind, relative_weight: relativeWeight(ind.key) }));
  const negative_factors = indicators
    .filter((ind) => classifyFactor(ind) === 'negative')
    .map((ind) => ({ ...ind, relative_weight: relativeWeight(ind.key) }));

  const recent_events = userId ? await loadRecentEvents(companyId, userId) : [];

  const dimension_trends = {};
  for (const d of DIMENSIONS) {
    const val = indexPack.dimensions?.[d.key];
    dimension_trends[d.key] = {
      label: d.label,
      value: val,
      weight: d.weight,
      contribution: val != null ? Math.round(val * d.weight * 100) / 100 : null
    };
  }

  return {
    ok: true,
    pulse_index: indexPack.pulse_index,
    confidence: indexPack.confidence,
    explainability: {
      ...base,
      positive_factors,
      negative_factors,
      dimension_trends,
      recent_events: recent_events.map((e) => ({
        type: e.event_type,
        source: e.event_source,
        at: e.created_at
      })),
      chart_series: buildChartSeries(dimension_trends, positive_factors, negative_factors)
    },
    governance: base.governance
  };
}

function relativeWeight(signalKey) {
  const map = {
    tpm_incidents: 0.15,
    proacao_proposals: 0.25,
    intelligent_registrations: 0.14,
    tasks_completed: 0.127,
    communications_read: 0.054,
    absence_rate: 0.15,
    overtime_minutes: 0.03,
    tenure_days: 0.1
  };
  return map[signalKey] || 0.05;
}

function buildChartSeries(dimensionTrends, positive, negative) {
  const dimensions = Object.entries(dimensionTrends || {}).map(([key, d]) => ({
    name: d.label || key,
    value: d.value ?? 0,
    contribution: d.contribution ?? 0
  }));
  const factors = [
    ...positive.map((f) => ({ name: f.key, value: f.value, type: 'positive', weight: f.relative_weight })),
    ...negative.map((f) => ({ name: f.key, value: f.value, type: 'negative', weight: f.relative_weight }))
  ];
  return { dimensions, factors };
}

module.exports = { buildAdvancedExplainability, classifyFactor };
