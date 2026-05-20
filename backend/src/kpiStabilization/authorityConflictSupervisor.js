'use strict';

const { detectKpiAuthorityConflicts } = require('../kpiRollout/kpiAuthorityConflictDetector');

function superviseAuthorityConflicts(user, kpiPayload, ctx = {}) {
  const authority = detectKpiAuthorityConflicts(user, kpiPayload, ctx);
  return {
    ...authority,
    recommendations: authority.conflict_detected
      ? ['Recomendação: resolver conflito de autoridade com supervisão humana']
      : [],
    auto_correct: false
  };
}

module.exports = { superviseAuthorityConflicts };
