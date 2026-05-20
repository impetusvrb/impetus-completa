'use strict';

const { logPhaseM } = require('./phaseMLogger');

const _history = [];

function trackSemanticDrift(snapshot) {
  const prev = _history[_history.length - 1];
  _history.push({ ...snapshot, ts: new Date().toISOString() });
  if (_history.length > 200) _history.shift();

  if (prev && prev.axis !== snapshot.axis) {
    logPhaseM('SEMANTIC_TRUTH_DEVIATION', { from: prev.axis, to: snapshot.axis });
    return { deviation: true, from: prev.axis, to: snapshot.axis };
  }
  return { deviation: false };
}

function getSemanticDriftHistory(limit = 20) {
  return _history.slice(-limit);
}

module.exports = { trackSemanticDrift, getSemanticDriftHistory };
