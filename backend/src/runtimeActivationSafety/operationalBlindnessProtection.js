'use strict';

function detectOperationalBlindness(ctx = {}) {
  let blindness = { critical_blind_spot: false };
  try {
    blindness = require('../summaryBlindness/summaryBlindnessFacade').detectSummaryBlindness(ctx.summary || {}, ctx);
  } catch {
    /* optional */
  }
  return {
    critical_blind_spot: blindness.critical_blind_spot === true,
    executive: blindness.executive,
    operational: blindness.operational,
    underdelivery: ctx.underdelivery?.critical_underdelivery
  };
}

module.exports = { detectOperationalBlindness };
