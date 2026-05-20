'use strict';

function evaluateRecommendationTrust(recommendation = {}) {
  const text = String(recommendation.text || recommendation.reply || '').trim();
  const len = text.length;
  const hasStructure = /\n|[-•]|\d\./.test(text);
  const vague = /talvez|possivelmente|não tenho certeza|incerto/i.test(text);
  let reliability = 0.7;
  if (len > 80 && len < 8000) reliability += 0.1;
  if (hasStructure) reliability += 0.08;
  if (vague) reliability -= 0.2;
  if (recommendation.degraded) reliability -= 0.15;
  return {
    recommendation_reliability: Number(Math.max(0.2, Math.min(1, reliability)).toFixed(4)),
    vague_language: vague,
    weak_guidance: len < 40 || vague
  };
}

module.exports = { evaluateRecommendationTrust };
