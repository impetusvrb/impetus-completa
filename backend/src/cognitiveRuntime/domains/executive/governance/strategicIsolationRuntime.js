'use strict';

const { protectBoardroomFromLeakage } = require('./boardroomLeakageProtection');
const { validateExecutiveSemanticBoundary } = require('./executiveSemanticBoundary');

function runStrategicIsolationRuntime(payload = {}, consolidated = {}) {
  const leak = protectBoardroomFromLeakage({ ...payload, centers: consolidated.centers });
  const boundary = validateExecutiveSemanticBoundary(payload, consolidated);
  return {
    ...leak,
    ...boundary,
    strategic_isolation_ok: leak.cross_domain_clean && boundary.ok
  };
}

module.exports = { runStrategicIsolationRuntime };
