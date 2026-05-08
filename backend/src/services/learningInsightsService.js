'use strict';

/**
 * Análise só de leitura sobre a memória operacional — sugestões, sem efeitos colaterais.
 */

const { getRecentInteractions } = require('./learningMemoryService');

/** decision_score costuma ser 0–1; métricas antigas podem vir 0–100 */
function confidenceToPercent(c) {
  if (c == null || !Number.isFinite(c)) return null;
  const n = Number(c);
  if (n >= 0 && n <= 1) return n * 100;
  return n;
}

function generateInsights() {
  const data = getRecentInteractions();

  if (data.length < 10) return [];

  const withScore = data.filter((i) => confidenceToPercent(i.confidence) != null);
  if (withScore.length < 10) return [];

  const lowConfidence = withScore.filter((i) => confidenceToPercent(i.confidence) < 50);

  if (lowConfidence.length > withScore.length * 0.3) {
    return [
      'Alta incidência de respostas com baixa confiança — verificar qualidade de contexto'
    ];
  }

  return [];
}

module.exports = {
  generateInsights,
  confidenceToPercent
};
