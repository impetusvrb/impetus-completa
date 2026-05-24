'use strict';

/**
 * Funde sinais dos sub-runtimes num "perfil cognitivo industrial" único
 * — usado pela camada de narrativa e pelo frontend.
 */
function fuseIndustrialCognition(parts = {}) {
  const { continuity = {}, context = {}, reasoning = {}, actions = {}, intent = {}, attention = {}, awareness = {} } = parts;
  const continuity_score = continuity?.continuation_score || 0;
  const awareness_score = context?.awareness_score || 0;
  const reasoning_quality = reasoning?.reasoning_quality || 0;
  const industrial_intelligence_score = reasoning?.industrial_intelligence_score || 0;

  const cognitive_density = Number(
    Math.min(
      1,
      continuity_score * 0.25 +
        awareness_score * 0.25 +
        reasoning_quality * 0.25 +
        industrial_intelligence_score * 0.25
    ).toFixed(3)
  );

  return {
    cognitive_density,
    primary_intent: intent?.primary,
    primary_focus: attention?.primary_focus,
    operational_state: awareness?.operational_state,
    has_inherited_context: !!continuity?.inherited_context,
    actions_prepared: actions?.count || 0,
    detected_risks: reasoning?.detected_risks || []
  };
}

module.exports = { fuseIndustrialCognition };
