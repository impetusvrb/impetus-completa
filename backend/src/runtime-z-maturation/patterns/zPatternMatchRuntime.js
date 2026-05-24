'use strict';

const lib = require('./zPatternLibraryRuntime');
const obs = require('./zPatternObservationRuntime');
const flags = require('../config/sz3FeatureFlags');

/**
 * Funde padrões estáticos (biblioteca) com padrões aprendidos (observação).
 * Devolve o perfil de padrão mais relevante para o contexto actual.
 */
function matchPatterns(tenantId, text = '', domains = []) {
  if (!flags.isPatternsEnabled()) return { matched: [], top: null, confidence: 0 };

  const staticMatches = lib.findByTrigger(text);
  const learnedTopPatterns = obs.topPatterns(tenantId, 5);

  // pontuação: match estático > match learned > sem match
  const scored = staticMatches.map((p) => ({
    ...p,
    score: Number(
      (0.6 +
        (domains.includes(p.domain) ? 0.2 : 0) +
        (learnedTopPatterns.some((lp) => lp.domains?.includes(p.domain)) ? 0.2 : 0)
      ).toFixed(3)
    ),
    source: 'library'
  }));

  scored.sort((a, b) => b.score - a.score);

  const top = scored[0] || null;
  const confidence = top ? top.score : 0;

  return {
    matched: scored,
    top,
    confidence,
    learned_pattern_count: obs.patternCount(tenantId),
    library_size: lib.all().length
  };
}

module.exports = { matchPatterns };
