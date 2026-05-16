'use strict';

/**
 * Narrativas executivas template-driven (sem LLM).
 */
function buildExecutiveNarrative(summary = {}) {
  const parts = [];
  if (summary.drift_severity === 'high' || summary.drift_severity === 'medium') {
    parts.push(
      `Detectada tendência de deterioração (${summary.drift_severity}) na série de processo analisada; confiança relativa ${((summary.drift_confidence ?? 0) * 100).toFixed(0)}%.`
    );
  }
  if (summary.recurrence_severity === 'high' || summary.recurrence_severity === 'medium') {
    parts.push(
      `Padrão de recorrência ${summary.recurrence_severity} na entidade dominante (${summary.dominant_key || 'n/d'}).`
    );
  }
  if (summary.supplier_trend === 'worsening') {
    parts.push('Fornecedor monitorizado apresenta agravamento de PPM entre metades temporais dos lotes fornecidos.');
  }
  if (summary.pre_anomaly_severity === 'high' || summary.pre_anomaly_severity === 'medium') {
    parts.push(`Pré-anomalia classificada como ${summary.pre_anomaly_severity} face a limites e declive.`);
  }
  if (summary.deterioration_severity === 'high' || summary.deterioration_severity === 'medium') {
    parts.push(`Degradação de processo ${summary.deterioration_severity} com aumento relativo de dispersão ou defeitos.`);
  }
  if (!parts.length) {
    parts.push('Não foram detectados desvios fortes com os sinais actuais; manter monitorização preventiva.');
  }
  return {
    ok: true,
    paragraphs: parts,
    headline: parts[0] || 'Síntese cognitiva assistiva.',
    language: 'pt-PT',
    assistive_only: true
  };
}

module.exports = { buildExecutiveNarrative };
