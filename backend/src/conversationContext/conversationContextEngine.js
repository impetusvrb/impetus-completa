'use strict';

/**
 * CERT-VOICE-01 — Conversation Context Engine
 *
 * Determina o perfil conversacional (tom, pausas, verbosidade) por interação.
 * Não altera JWT, permissões, truth enforcement ou governança estrutural.
 */

const { classifyConversationContext } = require('./conversationContextClassifier');
const { getProfile } = require('./conversationProfileRegistry');
const { isExecutiveUser } = require('./executiveConversationContext');
const {
  resolveExecutivePresentationContext,
  buildPresentationPromptBlock
} = require('./executivePresentationContext');
const { recordContextResolved } = require('./conversationContextObservability');
const dashboardProfileResolver = require('../services/dashboardProfileResolver');

const PROFILE_PROMPT_BLOCKS = Object.freeze({
  default:
    'PERFIL CONVERSACIONAL: padrão — curto, direto, natural; no máximo 1 ou 2 frases por turno.',
  operational:
    'PERFIL CONVERSACIONAL: operacional — respostas curtas e objetivas; foco em ação imediata; baixa latência; sem explicações longas.',
  technical:
    'PERFIL CONVERSACIONAL: técnico — pode detalhar procedimentos quando necessário; integre ManuIA e painel visual se o utilizador pedir diagnóstico ou análise de máquina; mantenha clareza industrial.',
  executive:
    'PERFIL CONVERSACIONAL: executivo — linguagem estratégica, síntese, agregações; omita microdetalhe operacional sem impacto decisório.',
  meeting:
    'PERFIL CONVERSACIONAL: reunião — no máximo UMA frase curta por turno; tom calmo e formal; pausas naturais; nunca monólogos; adequado para sala com outras pessoas.',
  presentation:
    'PERFIL CONVERSACIONAL: apresentação — uma frase por turno; tom formal e seguro; não exponha dados sensíveis ou financeiros detalhados; prefira KPIs consolidados.',
  executive_briefing:
    'PERFIL CONVERSACIONAL: briefing executivo — síntese do dia com prioridades e riscos; 1–2 frases; acionável.',
  strategic_analysis:
    'PERFIL CONVERSACIONAL: análise estratégica — visão agregada; destaque riscos e tendências; pode sugerir painel executivo se relevante.',
  boardroom:
    'PERFIL CONVERSACIONAL: boardroom — visão consolidada executiva; alinhado ao cockpit estratégico; conciso e decisório.'
});

function isEngineEnabled() {
  const v = String(process.env.IMPETUS_CONVERSATION_CONTEXT_ENGINE || 'on').toLowerCase();
  return v !== 'off' && v !== 'false' && v !== '0';
}

function buildPromptAppend(profile, classification, presentationContext = null) {
  const base = PROFILE_PROMPT_BLOCKS[profile.id] || PROFILE_PROMPT_BLOCKS.default;
  const lines = [
    '## Contexto Conversacional Cognitivo (CERT-VOICE-01)',
    `- Contexto detectado: ${classification.context_type}${classification.subcontext ? ` / ${classification.subcontext}` : ''}`,
    `- Perfil: ${profile.name} (${profile.id})`,
    `- Tom: ${profile.tone}`,
    `- Verbosidade: ${profile.verbosity}`,
    `- Detalhe: ${profile.detail_level}`,
    base,
    'IMPORTANTE: este perfil altera apenas estilo, ritmo e tamanho da resposta. Permissões, dados e governança IMPETUS permanecem inalterados.'
  ];
  if (profile.panel_behavior === 'on_request') {
    lines.push('- SmartPanel: abrir somente quando o utilizador pedir ou após acordo explícito.');
  } else if (profile.panel_behavior === 'proactive_when_relevant') {
    lines.push('- SmartPanel: pode sugerir visualização quando o contexto técnico/estratégico justificar e houver permissão.');
  }
  const presentationBlock = buildPresentationPromptBlock(presentationContext);
  if (presentationBlock) {
    lines.push('', presentationBlock);
  }
  return lines.join('\n');
}

/**
 * @param {object} user req.user
 * @param {{ queryText?: string, channel?: string, modoApresentacao?: boolean, presentationRequested?: boolean, presentationLevel?: string, executiveBoardroomActive?: boolean, previousProfileId?: string }} [opts]
 */
async function resolveConversationContext(user = {}, opts = {}) {
  if (!isEngineEnabled()) {
    const profile = getProfile('default');
    return {
      ok: true,
      engine: 'conversation_context',
      engine_enabled: false,
      context_type: 'default',
      subcontext: null,
      profile_id: profile.id,
      conversation_profile: profile,
      presentation_context: resolveExecutivePresentationContext(user, opts),
      prompt_append: '',
      confidence: 0,
      signals: ['engine_disabled'],
      fetched_at: new Date().toISOString()
    };
  }

  const queryText = String(opts.queryText || '').trim();
  const channel = String(opts.channel || 'voice').trim();

  const presentationContext = resolveExecutivePresentationContext(user, {
    queryText,
    channel,
    modoApresentacao: opts.modoApresentacao === true,
    presentationRequested: opts.presentationRequested,
    presentationLevel: opts.presentationLevel
  });

  let profileCode = '';
  try {
    profileCode = dashboardProfileResolver.resolveDashboardProfile(user) || '';
  } catch (_) {
    profileCode = String(user.dashboard_profile || '');
  }

  const classification = classifyConversationContext(queryText, { ...user, dashboard_profile: profileCode }, {
    modoApresentacao: presentationContext.enabled || opts.modoApresentacao === true,
    executiveBoardroomActive: opts.executiveBoardroomActive === true,
    presentationContext
  });

  let profileId = classification.profile_id || 'default';

  if (presentationContext.enabled) {
    profileId = 'presentation';
    classification.subcontext = 'presentation';
    classification.context_type = 'executive';
    classification.signals = [...(classification.signals || []), 'executive:presentation_context'];
    if (presentationContext.presentation_level === 'board') {
      classification.signals.push('executive:board_presentation');
      if (opts.executiveBoardroomActive) {
        classification.signals.push('executive:boardroom_presentation');
      }
    }
  } else if (classification.context_type === 'executive' && !classification.subcontext && isExecutiveUser(user)) {
    profileId = profileId === 'default' ? 'executive' : profileId;
  }

  const profile = getProfile(profileId);
  const prompt_append = buildPromptAppend(profile, classification, presentationContext);

  const result = {
    ok: true,
    engine: 'conversation_context',
    engine_enabled: true,
    context_type: classification.context_type,
    subcontext: classification.subcontext,
    profile_id: profile.id,
    conversation_profile: profile,
    presentation_context: presentationContext,
    executive_conversation_domain: presentationContext.enabled
      ? 'presentation'
      : classification.context_type === 'executive'
        ? classification.subcontext || 'executive'
        : null,
    prompt_append,
    confidence: presentationContext.enabled ? Math.max(classification.confidence, 0.9) : classification.confidence,
    signals: classification.signals,
    channel,
    executive_user: isExecutiveUser(user),
    fetched_at: new Date().toISOString()
  };

  recordContextResolved(
    {
      context_type: result.context_type,
      subcontext: result.subcontext,
      profile_id: result.profile_id,
      confidence: result.confidence
    },
    {
      channel,
      previous_profile_id: opts.previousProfileId || null
    }
  );

  return result;
}

module.exports = {
  isEngineEnabled,
  resolveConversationContext,
  buildPromptAppend
};
