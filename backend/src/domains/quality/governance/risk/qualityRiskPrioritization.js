'use strict';

const { rankFmeaRows } = require('./qualityFmeaRuntime');

function prioritizeByRpn(rows, threshold = 100) {
  const ranked = rankFmeaRows(rows);
  return {
    ranked,
    escalate: ranked.filter((r) => r.rpn >= threshold)
  };
}

module.exports = {
  prioritizeByRpn
};
