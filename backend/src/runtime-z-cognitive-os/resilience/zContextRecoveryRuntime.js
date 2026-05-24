'use strict';

function recoverContextOnFailure(reason = 'unknown') {
  return {
    recovered: true,
    fallback_used: true,
    reason,
    minimal_context: {
      continuation_score: 0,
      awareness_score: 0,
      reasoning_quality: 0,
      industrial_intelligence_score: 0,
      operational_state: 'idle',
      narrative: 'Contexto cognitivo indisponível — operação segura mantida (fallback Z).'
    }
  };
}

module.exports = { recoverContextOnFailure };
