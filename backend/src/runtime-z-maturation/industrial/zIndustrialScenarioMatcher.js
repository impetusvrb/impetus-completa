'use strict';

const { matchBehaviors } = require('./zIndustrialBehaviorLibrary');
const flags = require('../config/sz3FeatureFlags');

/**
 * Identifica o cenário industrial activo e devolve comportamentos esperados.
 */
function matchScenario(text = '', sz2Output = {}) {
  if (!flags.isIndustrialEnabled()) return { matched: false };

  const domains = sz2Output?.reasoning?.detected_risks || [];
  const criticality = sz2Output?.reasoning?.criticality?.level || 'low';

  const behaviors = matchBehaviors({ domains, criticality, text });
  if (!behaviors.length) return { matched: false };

  const top = behaviors[0];
  return {
    matched: true,
    scenario: top.scenario,
    expected_behaviors: top.expected_behaviors,
    response_tone: top.response_tone,
    human_authority_required: top.human_authority_required,
    auto_actions_blocked: top.auto_actions_blocked,
    all_matched: behaviors.map((b) => b.scenario)
  };
}

module.exports = { matchScenario };
