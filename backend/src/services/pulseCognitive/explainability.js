/**
 * CERT-PULSE-03 FASE 5 — Explicabilidade (nenhuma inferência em caixa-preta).
 */
'use strict';

const { DIMENSIONS } = require('./constants');

function buildExplainability(indexPack, perception, correlationPack, temporalPack = null) {
  const modules = (perception?.data_sources || []).map((s) => ({
    module: s,
    contributed: true
  }));

  const signalWeights = (indexPack.indicators_used || []).map((ind) => {
    const dim = inferPrimaryDimension(ind.key);
    const weight = DIMENSIONS.find((d) => d.key === dim)?.weight || 0.05;
    return {
      signal: ind.key,
      value: ind.value,
      primary_dimension: dim,
      weight_in_index: Math.round(weight * 1000) / 1000,
      modules: mapSignalToModules(ind.key)
    };
  });

  const correlations = (correlationPack.correlations || []).map((c) => ({
    type: c.type,
    note: c.note,
    confidence: c.confidence,
    indicators: c.indicators
  }));

  const patterns = (correlationPack.patterns || []).map((p) => ({
    code: p.code,
    label: p.label,
    severity: p.severity,
    signals: p.signals,
    confidence: p.confidence
  }));

  let similar_history = null;
  if (temporalPack?.individual?.trend) {
    similar_history = {
      trend_code: temporalPack.individual.trend.code,
      trend_label: temporalPack.individual.trend.label,
      confidence: temporalPack.individual.trend.confidence
    };
  }

  const conclusion_reason = buildConclusionReason(indexPack, correlationPack, temporalPack);

  return {
    signals_participating: indexPack.indicators_used || [],
    modules_contributed: modules,
    factor_weights: signalWeights,
    dimension_breakdown: indexPack.dimensions || {},
    correlations,
    patterns,
    confidence: indexPack.confidence,
    similar_history,
    conclusion_reason,
    governance: {
      assistive_only: true,
      human_in_the_loop: true,
      not_a_diagnosis: true
    }
  };
}

function inferPrimaryDimension(signalKey) {
  const map = {
    tpm_incidents: 'engagement',
    proacao_proposals: 'development',
    intelligent_registrations: 'learning',
    tasks_completed: 'participation',
    communications_read: 'participation',
    absence_rate: 'stability',
    overtime_minutes: 'stability',
    tenure_days: 'integration'
  };
  return map[signalKey] || 'engagement';
}

function mapSignalToModules(key) {
  const m = {
    tpm_incidents: ['tpm'],
    proacao_proposals: ['proacao'],
    intelligent_registrations: ['registro_inteligente'],
    tasks_completed: ['dashboard', 'operacao'],
    communications_read: ['comunicacao'],
    absence_rate: ['rh', 'ponto'],
    overtime_minutes: ['rh', 'ponto']
  };
  return m[key] || ['plataforma'];
}

function buildConclusionReason(indexPack, correlationPack, temporalPack) {
  const parts = [];
  parts.push(`Pulse Index ${indexPack.pulse_index} calculado a partir de ${(indexPack.indicators_used || []).length} sinais ponderados.`);
  if ((correlationPack.patterns || []).length) {
    parts.push(
      `${correlationPack.patterns.length} padrão(ões) correlacionados identificados (não conclusivos).`
    );
  }
  if (temporalPack?.individual?.trend?.label) {
    parts.push(`Tendência temporal: ${temporalPack.individual.trend.label}.`);
  }
  parts.push('Decisão organizacional permanece humana.');
  return parts.join(' ');
}

module.exports = { buildExplainability };
