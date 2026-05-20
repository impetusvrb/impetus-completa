'use strict';

const phaseU = require('./config/phaseUFeatureFlags');
const { logPhaseU } = require('./phaseULogger');
const { validateHierarchyKpis } = require('../kpiRollout/hierarchyKpiValidator');
const { checkDomainSeparation } = require('./operationalHierarchyResolver');
const { extractKpiList } = require('../kpiRollout/kpiTargetingValidator');

function superviseHierarchyIntegrity(user, kpiPayload, ctx = {}) {
  const hierarchy = validateHierarchyKpis(user, kpiPayload, ctx);
  const kpis = extractKpiList(kpiPayload);
  const separation = checkDomainSeparation(kpis);
  const conflicts = [...hierarchy.issues, ...separation];

  if (conflicts.length && phaseU.isKpiStabilizationObservabilityEnabled()) {
    logPhaseU('KPI_HIERARCHY_DELIVERY_CONFLICT', { count: conflicts.length, shadow_only: true });
  }

  return {
    hierarchy_integrity_score: hierarchy.hierarchy_accuracy,
    hierarchy_band: hierarchy.hierarchy_band,
    valid: hierarchy.valid && separation.length === 0,
    conflicts,
    auto_correct: false
  };
}

module.exports = { superviseHierarchyIntegrity };
