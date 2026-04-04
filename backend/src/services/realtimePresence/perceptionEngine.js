/**
 * Realtime Perception Engine — classifica intenção, criticidade e modo de resposta.
 * O cérebro decisório continua sendo a política IMPETUS + LLM nas rotas de chat;
 * aqui apenas estruturamos sinais para voz/presença em tempo real.
 */

const { normalizeRole, profileForTier } = require('./roleLanguageProfile');

const PERCEPTION_STATES = [
  'neutral_analysis',
  'operational_support',
  'executive_decision',
  'alert_response',
  'instructional_mode'
];

const EMOTIONAL = ['calm', 'focused', 'assertive', 'alert', 'explanatory'];

function detectUrgency(text) {
  const t = String(text || '').toLowerCase();
  if (/\burgente|parada|parou|alarme|incidente|falha crítica|agora\b|imediato/i.test(t)) {
    return 'alta';
  }
  if (/\bproblema|erro|atraso|risco|atenção\b/i.test(t)) return 'media';
  return 'baixa';
}

function classifyIntent(text) {
  const t = String(text || '').toLowerCase();
  if (/\b(kpi|meta|resultado|dashboard|estratég|investimento|aprova)/i.test(t)) return 'strategy';
  if (/\b(como faço|passo|procedimento|instru|tutorial|onde clico)/i.test(t)) return 'howto';
  if (/\b(alerta|alarme|falha|parou|sensor|plc|máquina|equipamento)/i.test(t)) return 'operational_alert';
  if (/\b(status|o que está|resumo|situação)/i.test(t)) return 'status_check';
  return 'general';
}

function pickPerceptionState({ intent, urgency, screenPath }) {
  const path = String(screenPath || '').toLowerCase();
  if (urgency === 'alta' || /alert|alarm|incident/i.test(path)) return 'alert_response';
  if (intent === 'howto' || /biblioteca|instru/i.test(path)) return 'instructional_mode';
  if (intent === 'strategy' || /executiv|centro.*custo|dashboard/i.test(path)) return 'executive_decision';
  if (intent === 'operational_alert' || /operacional|manutencao|tpm|diagnostic/i.test(path)) {
    return 'operational_support';
  }
  return 'neutral_analysis';
}

function pickEmotionalFunctional({ perceptionState, urgency }) {
  if (perceptionState === 'alert_response' || urgency === 'alta') return 'alert';
  if (perceptionState === 'instructional_mode') return 'explanatory';
  if (perceptionState === 'executive_decision') return 'assertive';
  if (perceptionState === 'operational_support') return 'focused';
  return 'calm';
}

function responseTypeFrom({ tier, perceptionState }) {
  if (perceptionState === 'executive_decision' && (tier === 'ceo' || tier === 'director')) return 'executiva';
  if (perceptionState === 'operational_support' || perceptionState === 'alert_response') return 'operacional';
  if (perceptionState === 'instructional_mode') return 'instrucional';
  if (tier === 'manager' || tier === 'supervisor') return 'tatica';
  return 'tecnica';
}

/**
 * @param {object} user — req.user
 * @param {{ message?: string, screen_path?: string, history_len?: number }} input
 */
function perceive(user, input = {}) {
  const message = String(input.message || '').trim();
  const screenPath = String(input.screen_path || '');
  const tier = normalizeRole(user);
  const lang = profileForTier(tier);
  const urgency = detectUrgency(message);
  const intent = classifyIntent(message);
  const perceptionState = pickPerceptionState({ intent, urgency, screenPath });
  const emotional = pickEmotionalFunctional({ perceptionState, urgency });
  const responseType = responseTypeFrom({ tier, perceptionState });

  return {
    ok: true,
    user_tier: tier,
    language_profile: lang,
    intention: intent,
    criticality: urgency,
    response_type: responseType,
    perception_state: perceptionState,
    emotional_functional: emotional,
    perception_states_catalog: PERCEPTION_STATES,
    emotional_catalog: EMOTIONAL,
    /** Instruções curtas para injetar em prompts de voz (IMPETUS controla texto) */
    prompt_augmentation: [
      `Perfil de voz: ${lang.language}`,
      `Modo percepção: ${perceptionState}. Criticidade: ${urgency}.`,
      `Responda em frases curtas (máx. 3–4), tom ${emotional}, tipo ${responseType}.`,
      'Priorize velocidade e clareza; pode complementar depois se o utilizador pedir detalhe.'
    ].join('\n')
  };
}

module.exports = {
  perceive,
  PERCEPTION_STATES,
  EMOTIONAL
};
