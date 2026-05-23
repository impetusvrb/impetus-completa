'use strict';

function prioritizeOperationalSignals(centers = []) {
  return [...centers].sort((a, b) => {
    const layerScore = (c) => (c.layer === 'operational' ? 2 : c.layer === 'governance' ? 1 : 0);
    return layerScore(b) - layerScore(a) || (b.weight || 0) - (a.weight || 0);
  });
}

module.exports = { prioritizeOperationalSignals };
