'use strict';

function validateSustainabilityInsights(consolidated = {}) {
  const ai = consolidated.environmental_contextual_ai;
  const answers = ai?.answers || [];
  return { useful: answers.length > 0 || (ai?.contextual_questions?.length ?? 0) >= 5 };
}

module.exports = { validateSustainabilityInsights };
