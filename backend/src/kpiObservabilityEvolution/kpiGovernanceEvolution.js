'use strict';

function buildKpiGovernanceEvolution(health = {}) {
  return {
    health_score: health.health_score,
    maturity_score: health.maturity?.maturity_score,
    enterprise_ready: health.maturity?.enterprise_ready,
    recorded_at: new Date().toISOString()
  };
}

module.exports = { buildKpiGovernanceEvolution };
