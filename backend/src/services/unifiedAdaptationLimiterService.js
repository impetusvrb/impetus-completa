'use strict';

/**
 * Limita oscilação de pesos adaptativos entre ciclos.
 * Flag: UNIFIED_ADAPTATION_LIMITER
 */

const MAX_DELTA = parseFloat(process.env.UNIFIED_ADAPTATION_MAX_DELTA || '0.15') || 0.15;

function clamp(x, lo, hi) {
  const n = Number(x);
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

const KEYS = ['risk', 'complexity', 'uncertainty', 'impact'];

/**
 * @param {{ risk?: number, complexity?: number, uncertainty?: number, impact?: number }} current
 * @param {{ risk?: number, complexity?: number, uncertainty?: number, impact?: number }} proposed
 */
function limitAdaptiveChange({ current, proposed }) {
  const cur = current && typeof current === 'object' ? current : {};
  const prop = proposed && typeof proposed === 'object' ? proposed : {};
  if (process.env.UNIFIED_ADAPTATION_LIMITER !== 'true') {
    const out = {};
    for (const k of KEYS) {
      out[k] = Number.isFinite(Number(prop[k])) ? Number(prop[k]) : Number(cur[k]) || 0.25;
    }
    return normalize(out);
  }

  const out = {};
  for (const k of KEYS) {
    const c0 = Number(cur[k]);
    const p0 = Number(prop[k]);
    const c = Number.isFinite(c0) ? c0 : 0.25;
    const p = Number.isFinite(p0) ? p0 : c;
    out[k] = clamp(p, c - MAX_DELTA, c + MAX_DELTA);
  }
  const normalized = normalize(out);
  try {
    console.info('[UNIFIED_ADAPTATION_LIMIT]', JSON.stringify({ max_delta: MAX_DELTA }));
  } catch (_e) {}
  return normalized;
}

function normalize(w) {
  const o = {
    risk: Number(w.risk) || 0.25,
    complexity: Number(w.complexity) || 0.25,
    uncertainty: Number(w.uncertainty) || 0.25,
    impact: Number(w.impact) || 0.25
  };
  const s = o.risk + o.complexity + o.uncertainty + o.impact;
  if (!s) return { risk: 0.4, complexity: 0.2, uncertainty: 0.2, impact: 0.2 };
  return {
    risk: o.risk / s,
    complexity: o.complexity / s,
    uncertainty: o.uncertainty / s,
    impact: o.impact / s
  };
}

module.exports = {
  limitAdaptiveChange,
  MAX_DELTA
};
