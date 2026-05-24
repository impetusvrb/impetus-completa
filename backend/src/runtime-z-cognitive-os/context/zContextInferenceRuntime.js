'use strict';

const flags = require('../config/sz2FeatureFlags');
const { inferTemporal } = require('./zTemporalInferenceRuntime');
const { inferShift } = require('./zShiftInferenceRuntime');
const { inferUrgency } = require('./zUrgencyInferenceRuntime');
const { inferRisk } = require('./zRiskInferenceRuntime');
const { buildOperationalContext } = require('./zOperationalContextRuntime');
const { buildWorkflowContext } = require('./zWorkflowContextRuntime');
const { buildCrossDomainContext } = require('./zCrossDomainContextRuntime');

/**
 * Façade de inferência contextual. Não toca em DB. Composta apenas
 * por inferências determinísticas + sinais já presentes no payload Z.
 */
function inferContext(tenantId, user = {}, currentMessage = '', payloadFromZRuntime = {}, reasoning = {}) {
  if (!flags.isContextInferenceEnabled()) {
    return { skipped: true };
  }

  const temporal = inferTemporal();
  const shift = inferShift();
  const operational = buildOperationalContext(tenantId, user);
  const workflow = buildWorkflowContext(tenantId);
  const cross = buildCrossDomainContext(payloadFromZRuntime);
  const urgency = inferUrgency(currentMessage, { operational });
  const risk = inferRisk(reasoning, { operational, cognitive: payloadFromZRuntime });

  const awareness_score = Number(
    Math.min(
      1,
      (cross.multi_domain ? 0.25 : 0.1) +
        (operational.state !== 'idle' ? 0.25 : 0.1) +
        (workflow.has_active_workflow ? 0.2 : 0) +
        urgency.urgency_score * 0.2
    ).toFixed(3)
  );

  return {
    temporal,
    shift,
    operational,
    workflow,
    cross_domain: cross,
    urgency,
    risk,
    awareness_score,
    assistive_only: true
  };
}

module.exports = { inferContext };
