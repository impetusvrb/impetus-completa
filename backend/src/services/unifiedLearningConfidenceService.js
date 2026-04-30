'use strict';

/**
 * Confiança estatística no buffer de aprendizado — evita over-fit com poucas amostras.
 * Flag: UNIFIED_LEARNING_CONFIDENCE (OFF = retorno permissivo para não alterar comportamento).
 */

/**
 * @param {object} params
 * @param {{ n?: number }|null} [params.learningStats]
 * @param {number} [params.evidenceCount] — contagem de evidências correlacionáveis (opcional)
 * @returns {{ confidence: number, reliable: boolean, sample_size: number, skipped?: boolean }}
 */
function evaluateLearningConfidence({ learningStats, evidenceCount }) {
  const off = {
    confidence: 1,
    reliable: true,
    sample_size: learningStats && Number(learningStats.n) ? Number(learningStats.n) : 0,
    skipped: true
  };
  if (process.env.UNIFIED_LEARNING_CONFIDENCE !== 'true') {
    return off;
  }

  const n = learningStats && Number.isFinite(Number(learningStats.n)) ? Number(learningStats.n) : 0;
  let confidence = 0.5;
  let reliable = true;

  if (n < 5) {
    confidence = 0.2;
    reliable = false;
  } else if (n < 20) {
    confidence = 0.5;
    reliable = true;
  } else if (n >= 50) {
    confidence = 0.9;
    reliable = true;
  } else {
    confidence = 0.5 + ((n - 20) / 30) * 0.4;
    reliable = true;
  }

  const ev = Number(evidenceCount);
  if (Number.isFinite(ev) && ev > 0) {
    confidence *= Math.min(1, ev / 10);
  }

  confidence = Math.round(Math.min(1, Math.max(0, confidence)) * 1000) / 1000;

  const out = { confidence, reliable, sample_size: n };
  try {
    console.info('[UNIFIED_LEARNING_CONFIDENCE]', JSON.stringify(out));
  } catch (_e) {}
  return out;
}

module.exports = {
  evaluateLearningConfidence
};
