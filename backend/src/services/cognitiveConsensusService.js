'use strict';

/**
 * Engine de consenso / divergência cognitiva — só observabilidade.
 * Não altera decisões, prompts, pipeline ou tuning.
 */

function isConsensusEngineEnabled() {
  return String(process.env.IMPETUS_COGNITIVE_CONSENSUS_ENABLED ?? '')
    .trim()
    .toLowerCase() === 'true';
}

function normalizeText(text = '') {
  return String(text || '')
    .toLowerCase()
    .trim();
}

/** Normaliza confiança para escala 0–100 (percentagem). */
function toConfidencePercent(raw) {
  if (raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n >= 0 && n <= 1) return n * 100;
  return n;
}

function detectConfidenceDivergence(scores = []) {
  if (!scores.length) {
    return {
      divergence: false,
      spread: 0
    };
  }

  const max = Math.max(...scores);
  const min = Math.min(...scores);

  return {
    divergence: max - min > 30,
    spread: max - min
  };
}

function detectNarrativeDivergence(outputs = []) {
  const normalized = outputs.map((o) => normalizeText(o));

  const riskyPatterns = [
    'critico',
    'estavel',
    'indefinido',
    'alto risco',
    'baixo risco'
  ];

  const detected = riskyPatterns.filter((pattern) =>
    normalized.some((text) => text.includes(pattern))
  );

  return {
    divergence: detected.length > 1,
    patterns: detected
  };
}

function calculateConsensusScore({ confidenceSpread, narrativeDivergence }) {
  let score = 100;

  score -= Math.min(confidenceSpread, 50);

  if (narrativeDivergence) {
    score -= 30;
  }

  return Math.max(score, 0);
}

/**
 * @param {Array<{ engine?: string, confidence?: number, output?: string }>} participants
 */
async function generateConsensusReport({ participants }) {
  const list = Array.isArray(participants) ? participants : [];
  const scores = list
    .map((p) => toConfidencePercent(p && p.confidence))
    .filter((s) => s != null && Number.isFinite(s));
  const outputs = list.map((p) => (p && p.output != null ? String(p.output) : ''));

  const confidence = detectConfidenceDivergence(scores);
  const narrative = detectNarrativeDivergence(outputs);
  const anyDivergence = confidence.divergence || narrative.divergence;

  const consensus_score = calculateConsensusScore({
    confidenceSpread: confidence.spread,
    narrativeDivergence: narrative.divergence
  });

  try {
    console.log('[COGNITIVE_CONSENSUS]', {
      participants: list.length,
      consensus_score,
      spread: confidence.spread,
      narrative_patterns: narrative.patterns.length
    });
  } catch (_e) {}

  if (anyDivergence) {
    try {
      console.log('[COGNITIVE_DIVERGENCE]', {
        confidence_divergence: confidence.divergence,
        narrative_divergence: narrative.divergence,
        spread: confidence.spread,
        patterns: narrative.patterns
      });
    } catch (_e) {}
  }

  return {
    confidence,
    narrative,
    consensus_score,
    divergence_detected: anyDivergence,
    participants_summary: list.map((p) => ({
      engine: p && p.engine != null ? String(p.engine).slice(0, 128) : 'unknown',
      confidence_pct: toConfidencePercent(p && p.confidence)
    }))
  };
}

module.exports = {
  isConsensusEngineEnabled,
  normalizeText,
  toConfidencePercent,
  detectConfidenceDivergence,
  detectNarrativeDivergence,
  calculateConsensusScore,
  generateConsensusReport
};
