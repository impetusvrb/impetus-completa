'use strict';

function correlateOperatorFeedback(payload = {}, utility = {}) {
  const feedbackSignals = payload.governance_learning?.patterns_detected?.length ?? 0;
  const adaptive = payload.adaptive_orchestration?.adaptation_recommended;
  const actionsTaken = 0;

  const feedback_correlation = feedbackSignals > 0 || adaptive ? 0.55 : 0.35;
  const operational_response = utility.useful_insights_ratio ?? 0;
  const efficacy = Number(((feedback_correlation + operational_response) / 2).toFixed(3));

  return {
    feedback_signals: feedbackSignals,
    adaptation_recommended: adaptive === true,
    actions_taken_count: actionsTaken,
    feedback_operational_correlation: efficacy,
    operator_engagement_proxy: Number(Math.min(1, feedbackSignals * 0.15 + operational_response * 0.5).toFixed(3)),
    auto_decisions: false
  };
}

module.exports = { correlateOperatorFeedback };
