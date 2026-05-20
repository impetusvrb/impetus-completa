'use strict';

const phaseT = require('./config/phaseTFeatureFlags');
const { logPhaseT } = require('./phaseTLogger');
const { detectKpiLeakage } = require('./kpiLeakageDetector');
const { detectKpiUnderdelivery } = require('./kpiUnderdeliveryDetector');
const { detectKpiAuthorityConflicts } = require('./kpiAuthorityConflictDetector');
const { validateOperationalKpiDelivery } = require('./operationalKpiDeliveryValidator');

function stabilizeKpiDelivery(user, kpiPayload, ctx = {}) {
  const delivery = validateOperationalKpiDelivery(user, kpiPayload, ctx);
  const leakage = detectKpiLeakage(user, kpiPayload, ctx);
  const underdelivery = detectKpiUnderdelivery(user, kpiPayload, ctx);
  const authority = detectKpiAuthorityConflicts(user, kpiPayload, ctx);

  const issues = [
    ...(leakage.leaks || []),
    ...(authority.conflicts || []),
    ...delivery.issues
  ];

  if (delivery.targeting?.issues?.some((i) => i.type === 'targeting_mismatch')) {
    logPhaseT('KPI_CONTEXTUAL_AMBIGUITY', { shadow_only: true });
  }
  if (delivery.hierarchy?.issues?.some((i) => i.type?.includes('hierarchy'))) {
    logPhaseT('KPI_HIERARCHY_MISMATCH', { shadow_only: true });
  }

  const instability =
    leakage.leakage_detected ||
    underdelivery.underdelivery ||
    authority.conflict_detected ||
    !delivery.valid;

  const stability = instability ? Math.max(0.4, 0.92 - issues.length * 0.06) : 0.93;

  return {
    stable: !instability || !phaseT.isKpiDeliveryStabilizationEnabled(),
    KPI_runtime_stability: Number(stability.toFixed(4)),
    delivery,
    leakage,
    underdelivery,
    authority,
    issues,
    shadow_only: !phaseT.isKpiDeliveryStabilizationEnabled()
  };
}

module.exports = { stabilizeKpiDelivery };
