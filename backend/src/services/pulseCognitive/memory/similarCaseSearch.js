/**
 * CERT-PULSE-05 FASE 2 — Busca por casos organizacionais semelhantes.
 */
'use strict';

function parseJson(v) {
  if (v == null) return v;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(v);
  } catch (_) {
    return v;
  }
}

function buildFingerprint(signature = {}) {
  const patterns = (signature.pattern_codes || []).slice().sort().join('|');
  const band = signature.pulse_index_band ?? 'na';
  const state = signature.organizational_state || 'unknown';
  const flags = [
    signature.low_proacao ? 'lp' : '',
    signature.high_sst ? 'hs' : '',
    signature.pulse_drop ? 'pd' : '',
    signature.training_followed ? 'tf' : ''
  ]
    .filter(Boolean)
    .join(',');
  return `${band}:${state}:${patterns}:${flags}`;
}

function buildSignatureFromContext(ctx = {}) {
  const idx = parseFloat(ctx.pulse_index) || 50;
  const patterns = ctx.pattern_codes || (ctx.patterns || []).map((p) => p.code || p);
  return {
    pulse_index_band: Math.floor(idx / 10) * 10,
    organizational_state: ctx.organizational_state || ctx.state_code || 'stable_team',
    pattern_codes: patterns,
    low_proacao: (ctx.proacao_count ?? ctx.proposals ?? 99) < 2,
    high_sst: (ctx.sst_events ?? ctx.sst_count ?? 0) >= 2,
    pulse_drop: ctx.pulse_drop === true,
    training_followed: ctx.training_followed === true
  };
}

function jaccard(a, b) {
  const setA = new Set(a || []);
  const setB = new Set(b || []);
  if (!setA.size && !setB.size) return 0.5;
  let inter = 0;
  for (const x of setA) if (setB.has(x)) inter++;
  const union = new Set([...setA, ...setB]).size;
  return union ? inter / union : 0;
}

function scoreSimilarity(current, historical) {
  const cur = parseJson(historical.signal_signature) || historical.signal_signature || {};
  const curPatterns = current.pattern_codes || [];
  const histPatterns = parseJson(historical.pattern_codes) || historical.pattern_codes || [];

  let score = 0;
  if (current.pulse_index_band === cur.pulse_index_band) score += 0.25;
  if (current.organizational_state === historical.organizational_state) score += 0.2;
  score += jaccard(curPatterns, histPatterns) * 0.35;
  if (current.low_proacao === cur.low_proacao) score += 0.05;
  if (current.high_sst === cur.high_sst) score += 0.1;
  if (current.pulse_drop === cur.pulse_drop) score += 0.05;

  const validatedBoost = historical.human_validated ? 0.1 : 0;
  return Math.min(0.95, score + validatedBoost);
}

function rankSimilarCases(currentSignature, memoryRows, opts = {}) {
  const minScore = opts.min_score ?? 0.45;
  const limit = Math.min(opts.limit ?? 5, 10);

  const ranked = (memoryRows || [])
    .map((row) => ({
      ...row,
      similarity_score: Math.round(scoreSimilarity(currentSignature, row) * 1000) / 1000,
      pattern_codes: parseJson(row.pattern_codes),
      signal_signature: parseJson(row.signal_signature),
      human_actions: parseJson(row.human_actions),
      outcome: parseJson(row.outcome)
    }))
    .filter((r) => r.similarity_score >= minScore)
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, limit);

  return ranked;
}

module.exports = {
  buildFingerprint,
  buildSignatureFromContext,
  rankSimilarCases,
  scoreSimilarity
};
