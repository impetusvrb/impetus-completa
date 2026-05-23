'use strict';

function buildStrategicNarrative(enterprise = {}, strategic = {}, reliability = {}) {
  const paragraphs = [
    `Saúde enterprise: índice ${enterprise.health_index ?? '—'} · maturidade ${strategic.maturity ?? '—'}.`,
    `Convergência organizacional ${Math.round((strategic.convergence ?? 0.7) * 100)}% · confiabilidade ${reliability.reliability_index ?? '—'}.`,
    `Risco consolidado ${enterprise.risk_index ?? '—'} · pressão decisória ${enterprise.pressure_index ?? '—'}.`
  ];
  return { paragraphs, focus: ['estabilidade', 'risco', 'maturidade', 'convergência'], generic_filler: false };
}

module.exports = { buildStrategicNarrative };
