'use strict';

const { assessExecutiveOperationalAlignment } = require('./executiveOperationalAlignment');

function assessStrategicOperationalBalance(kpis = [], ctx = {}) {
  const alignment = ctx.alignment || assessExecutiveOperationalAlignment(kpis, ctx);
  return {
    balanced: alignment.aligned && alignment.balance_score >= 0.35,
    balance_score: alignment.balance_score,
    skew: alignment.skew
  };
}

module.exports = { assessStrategicOperationalBalance };
