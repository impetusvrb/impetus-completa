'use strict';

function clamp01(n) {
  return Math.max(0, Math.min(1, Number(n) || 0));
}

function correlatePair(a, b, label, opts = {}) {
  const na = a != null ? Number(a) : null;
  const nb = b != null ? Number(b) : null;
  if (!Number.isFinite(na) || !Number.isFinite(nb)) {
    return { ok: false, label, score: 0, assistive_only: true };
  }
  const delta = Math.abs(na - nb);
  const score = clamp01(opts.inverse ? 1 - delta / (opts.scale || 1) : 1 - delta / (opts.scale || 1));
  return {
    ok: true,
    label,
    correlation_score: score,
    inputs: { a: na, b: nb },
    assistive_only: true,
    enforcement: false
  };
}

function narrative(label, score) {
  const strength = score >= 0.7 ? 'forte' : score >= 0.45 ? 'moderada' : 'fraca';
  return { text: `Correlação assistiva ${label}: ligação ${strength}.`, confidence: score };
}

module.exports = { clamp01, correlatePair, narrative };
