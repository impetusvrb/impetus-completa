'use strict';

function analyzeContextualNoise(payload = {}) {
  const widgets = payload.widgets_promoted?.length ?? 0;
  const generic = (payload.widgets_promoted || []).filter((w) => /insights|interactions|generic/i.test(String(w.id))).length;
  const ratio = widgets ? generic / widgets : 0;
  return { noise_ratio: Math.round(ratio * 100) / 100, contextual_noise: ratio > 0.35 };
}

module.exports = { analyzeContextualNoise };
