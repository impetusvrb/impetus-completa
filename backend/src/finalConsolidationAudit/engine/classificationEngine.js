'use strict';

/**
 * Classificação final do sistema (experimental → international-ready).
 */

const LEVELS = Object.freeze([
  { id: 'experimental', label: 'Experimental', min_score: 0 },
  { id: 'pilot', label: 'Pilot', min_score: 45 },
  { id: 'enterprise_ready', label: 'Enterprise-ready', min_score: 65 },
  { id: 'industrial_ready', label: 'Industrial-ready', min_score: 75 },
  { id: 'international_ready', label: 'International-ready', min_score: 85 }
]);

function classifySystem(scores, promptValidation, antiPatterns = {}) {
  const overall = scores.overall_weighted;
  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (overall >= l.min_score) level = l;
  }

  const blockers = [];
  if (promptValidation.shadow_count > 5) {
    blockers.push('excessive_shadow_flags');
  }
  if (scores.industrial_readiness_score < 60) {
    blockers.push('industrial_telemetry_not_proven');
  }
  if (antiPatterns.eternal_shadow_first) {
    blockers.push('shadow_first_eternal_detected');
  }
  if (scores.governance_score < 55) {
    blockers.push('governance_below_threshold');
  }

  if (blockers.includes('industrial_telemetry_not_proven') && level.id === 'industrial_ready') {
    level = LEVELS.find((l) => l.id === 'enterprise_ready');
  }
  if (blockers.includes('excessive_shadow_flags') && ['industrial_ready', 'international_ready'].includes(level.id)) {
    level = LEVELS.find((l) => l.id === 'enterprise_ready');
  }

  const transitioned_from = {
    was_shadow_first_eternal: antiPatterns.eternal_shadow_first === true,
    was_pilot_ficticio: promptValidation.production_on_pct < 50,
    was_runtime_observativo_only: scores.architecture_score < 55,
    was_experimental: overall < 45
  };

  const became = {
    enterprise_grade: scores.governance_score >= 65 && scores.maturity_score_final >= 65,
    industrial_grade: scores.industrial_readiness_score >= 70,
    compliance_grade: scores.certification_readiness_score >= 70,
    auditable: scores.governance_score >= 60,
    operational: promptValidation.production_on_pct >= 70,
    governed: scores.governance_score >= 70,
    secure: scores.ai_safety_score >= 65,
    commercializable: scores.overall_weighted >= 68 && scores.international_readiness_score >= 60
  };

  return {
    classification: level.id,
    classification_label: level.label,
    overall_score: overall,
    blockers,
    transitioned_from,
    became,
    levels_reference: LEVELS.map((l) => ({ id: l.id, label: l.label, min_score: l.min_score }))
  };
}

function detectAntiPatterns(evidence, promptValidation) {
  const shadows = evidence.shadow_anti_patterns || [];
  const domainShadows = shadows.filter(
    (s) => /SAFETY|ENVIRONMENT|PUBLICATION_SHADOW|ADAPTIVE|GOVERNANCE_LEARNING/i.test(s.flag)
  );
  return {
    eternal_shadow_first: domainShadows.length >= 2 && promptValidation.production_on_pct < 85,
    pilot_ficticio: promptValidation.production_on_count < 20,
    runtime_observativo_only:
      !evidence.runtime_health_probes?.action_runtime?.health?.active &&
      promptValidation.prompts.filter((p) => p.prompt_id >= 23 && p.production_on).length < 5,
    architecture_experimental: evidence.effective_flags_count < 50
  };
}

module.exports = { classifySystem, detectAntiPatterns, LEVELS };
