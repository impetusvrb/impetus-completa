'use strict';

function emitLearningObservability(event, meta = {}) {
  if (process.env.IMPETUS_LEARNING_OBSERVABILITY === 'off') return;
  try {
    console.log(JSON.stringify({ ts: new Date().toISOString(), layer: 'Z.29', event, ...meta }));
  } catch (_) {}
}

module.exports = { emitLearningObservability };
