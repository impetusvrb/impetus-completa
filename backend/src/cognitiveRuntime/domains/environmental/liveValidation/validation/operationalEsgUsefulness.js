'use strict';

function scoreOperationalEsgUsefulness(esg = {}, compliance = {}) {
  let score = 0.5;
  if (esg.contextual) score += 0.2;
  if (esg.auditable) score += 0.15;
  if (compliance.compliant !== false) score += 0.15;
  return Math.round(score * 100) / 100;
}

module.exports = { scoreOperationalEsgUsefulness };
