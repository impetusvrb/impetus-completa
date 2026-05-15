'use strict';

/**
 * Votação cognitiva ponderada — só observação e sugestão de métricas.
 * Não altera prompts, pipeline, council, autonomia, CSI nem calibração.
 */

const DEFAULT_WEIGHTS = Object.freeze({
  gpt: 1.0,
  claude: 1.2,
  gemini: 0.9
});

function isWeightedVotingEnabled() {
  return String(process.env.IMPETUS_WEIGHTED_VOTING_ENABLED ?? '')
    .trim()
    .toLowerCase() === 'true';
}

/** Pesos efectivos: defaults + override JSON em IMPETUS_WEIGHTED_VOTING_WEIGHTS */
function getResolvedWeights() {
  const base = { ...DEFAULT_WEIGHTS };
  const raw = process.env.IMPETUS_WEIGHTED_VOTING_WEIGHTS;
  if (raw == null || String(raw).trim() === '') return base;
  try {
    const parsed = JSON.parse(String(raw));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [k, v] of Object.entries(parsed)) {
        const key = String(k).toLowerCase().trim();
        const n = Number(v);
        if (key && Number.isFinite(n) && n > 0) base[key] = n;
      }
    }
  } catch (e) {
    try {
      console.warn('[COGNITIVE_VOTING_ERROR]', {
        op: 'getResolvedWeights',
        message: e?.message || e
      });
    } catch (_e) {}
  }
  return base;
}

/** Confiança em escala 0–100 para coerência com o engine de consenso */
function participantConfidencePercent(raw) {
  if (raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n >= 0 && n <= 1) return n * 100;
  return n;
}

/**
 * @param {{ participants: Array<{ engine?: string, confidence?: number }>, weights?: Record<string, number> }} opts
 * @returns {number|null}
 */
function calculateWeightedConsensus({ participants, weights } = {}) {
  const list = Array.isArray(participants) ? participants : [];
  const wmap = weights && typeof weights === 'object' ? weights : getResolvedWeights();

  let totalWeight = 0;
  let weightedScore = 0;

  for (const p of list) {
    const engine =
      p && p.engine != null ? String(p.engine).toLowerCase().trim().slice(0, 64) : 'unknown';
    const conf = participantConfidencePercent(p && p.confidence);
    if (conf == null) continue;
    const weight = Number(wmap[engine]);
    const w = Number.isFinite(weight) && weight > 0 ? weight : 1;
    weightedScore += conf * w;
    totalWeight += w;
  }

  if (totalWeight <= 0) return null;
  return Math.round(weightedScore / totalWeight);
}

/**
 * @param {{ participants?: unknown, weights?: Record<string, number> }} opts
 */
function detectDominance({ participants: _participants, weights } = {}) {
  const wmap = weights && typeof weights === 'object' ? weights : getResolvedWeights();
  const dominant = Object.entries(wmap).find(([, weight]) => Number(weight) >= 2);

  return {
    dominance_detected: !!dominant,
    dominant_engine: dominant ? String(dominant[0]) : null
  };
}

/**
 * @param {{ participants: Array<{ engine?: string, confidence?: number }>, weights?: Record<string, number> }} opts
 */
async function generateWeightedVotingReport({ participants, weights } = {}) {
  const w = weights && typeof weights === 'object' ? { ...getResolvedWeights(), ...weights } : getResolvedWeights();

  if (!isWeightedVotingEnabled()) {
    try {
      console.info('[COGNITIVE_VOTING]', { enabled: false, note: 'kill_switch' });
    } catch (_e) {}
    return {
      weighted_consensus: null,
      dominance: { dominance_detected: false, dominant_engine: null },
      weights_snapshot: w,
      observation: 'weighted_voting_disabled'
    };
  }

  const list = Array.isArray(participants) ? participants : [];
  const weighted_consensus = calculateWeightedConsensus({ participants: list, weights: w });
  const dominance = detectDominance({ participants: list, weights: w });

  try {
    console.info('[COGNITIVE_VOTING]', {
      weighted_consensus,
      dominance_detected: dominance.dominance_detected,
      dominant_engine: dominance.dominant_engine,
      participants: list.length
    });
    if (dominance.dominance_detected) {
      console.warn('[COGNITIVE_DOMINANCE]', {
        dominant_engine: dominance.dominant_engine,
        weights_snapshot: w
      });
    }
  } catch (_e) {}

  return {
    weighted_consensus,
    dominance,
    dominant_engine: dominance.dominant_engine,
    weights_snapshot: w
  };
}

module.exports = {
  DEFAULT_WEIGHTS,
  isWeightedVotingEnabled,
  getResolvedWeights,
  participantConfidencePercent,
  calculateWeightedConsensus,
  detectDominance,
  generateWeightedVotingReport
};
