'use strict';

const { ensureMinimumOperationalKpis } = require('./minimumOperationalKpiSet');

function applyOperationalKpiFallback(filtered, original, ctx = {}) {
  return ensureMinimumOperationalKpis(filtered, original, ctx);
}

module.exports = { applyOperationalKpiFallback };
