'use strict';

function assessRenderGovernanceHealth(payload = {}, promotion = {}, eligibility = {}) {
  const issues = [];
  if (eligibility.governance_locked && (promotion.widgets_promoted_count || 0) > 0) {
    issues.push('governance_locked_with_promotion');
  }
  if (promotion.fallback?.used) {
    issues.push('render_fallback_active');
  }
  if ((promotion.suppression?.generic_suppressed_count || 0) > 6) {
    issues.push('excessive_suppression');
  }

  return {
    healthy: issues.length === 0,
    issues,
    terminal_safe: eligibility.terminal_safe !== false,
    rollback_safe: eligibility.rollback_safe !== false,
    global_replace: false
  };
}

module.exports = { assessRenderGovernanceHealth };
