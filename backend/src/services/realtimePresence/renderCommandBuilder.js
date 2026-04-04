/**
 * Realtime Render Controller (servidor) — traduz estado de conversa + percepção em comando visual.
 * Akool (ou outro motor) apenas executa; não decide comportamento.
 */

const VISUAL_STATES = [
  'listening',
  'thinking',
  'responding',
  'calm',
  'alert',
  'executive',
  'technical',
  'instructional'
];

/**
 * @param {'listening'|'processing'|'speaking'|'idle'} voicePhase — fase do motor de voz no cliente
 * @param {object} perception — saída de perceptionEngine.perceive
 */
function buildRenderCommand(voicePhase, perception = {}) {
  const pe = perception.perception_state || 'neutral_analysis';
  const em = perception.emotional_functional || 'calm';
  const tier = perception.user_tier || 'unknown';

  let expression_state = 'calm';
  let speaking_mode = false;
  let listening_mode = false;
  let head_movement = 'micro_idle';
  let eye_focus = 'forward_soft';

  if (voicePhase === 'speaking') {
    expression_state = 'responding';
    speaking_mode = true;
    listening_mode = false;
    head_movement = 'subtle_nod';
    eye_focus = 'forward_engaged';
  } else if (voicePhase === 'listening') {
    expression_state = 'listening';
    listening_mode = true;
    speaking_mode = false;
    head_movement = 'micro_sway';
    eye_focus = 'forward_attentive';
  } else if (voicePhase === 'processing') {
    expression_state = 'thinking';
    speaking_mode = false;
    listening_mode = false;
    head_movement = 'still_thinking';
    eye_focus = 'slight_down';
  } else {
    expression_state = 'calm';
    speaking_mode = false;
    listening_mode = false;
    head_movement = 'ambient';
    eye_focus = 'forward_soft';
  }

  // Postura base por percepção / cargo (sobrepõe nuances, não a fase)
  if (pe === 'alert_response' || em === 'alert') {
    expression_state = voicePhase === 'speaking' ? 'responding' : 'alert';
    eye_focus = 'wide_focus';
  } else if (pe === 'executive_decision' || tier === 'ceo' || tier === 'director') {
    expression_state = voicePhase === 'idle' ? 'executive' : expression_state;
  } else if (pe === 'instructional_mode') {
    expression_state = voicePhase === 'idle' ? 'instructional' : expression_state;
  } else if (pe === 'operational_support') {
    expression_state = voicePhase === 'idle' ? 'technical' : expression_state;
  }

  const intensity_level = em === 'alert' ? 0.85 : em === 'assertive' ? 0.7 : em === 'focused' ? 0.55 : 0.4;

  return {
    version: 1,
    timestamp: Date.now(),
    expression_state,
    intensity_level: Math.min(1, Math.max(0.15, intensity_level + (speaking_mode ? 0.1 : 0))),
    head_movement,
    eye_focus,
    speaking_mode,
    listening_mode,
    /** Metadados para o cliente / Akool */
    visual_state: VISUAL_STATES.includes(expression_state) ? expression_state : 'calm',
    perception_ref: { perception_state: pe, emotional: em, tier }
  };
}

module.exports = { buildRenderCommand, VISUAL_STATES };
