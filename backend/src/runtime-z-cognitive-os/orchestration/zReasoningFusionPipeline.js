'use strict';

const { reasonIndustrial } = require('../reasoning/zIndustrialReasoningRuntime');
const { buildDecisionSupport } = require('../reasoning/zOperationalDecisionSupportRuntime');

function fuseReasoning({ tenantId, message, continuity, context }) {
  const reasoning = reasonIndustrial(tenantId, message, { continuity, operational: context?.operational });
  const decision = buildDecisionSupport(tenantId, message, { continuity, operational: context?.operational });
  return { reasoning, decision_support: decision };
}

module.exports = { fuseReasoning };
