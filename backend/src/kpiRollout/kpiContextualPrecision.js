'use strict';

const { normalizeAxis } = require('./kpiDomainRegistry');
const { validateKpiTargeting } = require('./kpiTargetingValidator');

function measureKpiContextualPrecision(user, kpiPayload, ctx = {}) {
  const targeting = validateKpiTargeting(user, kpiPayload, ctx);
  const axis = normalizeAxis(ctx.functional_axis || user?.functional_axis);
  const ambiguous = !axis || axis === 'general';

  return {
    KPI_contextual_precision: targeting.targeting_precision,
    contextual_axis: axis,
    ambiguous_axis: ambiguous,
    sufficient: targeting.targeting_precision >= 0.7 && !ambiguous
  };
}

module.exports = { measureKpiContextualPrecision };
