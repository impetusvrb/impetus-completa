'use strict';

/**
 * CERT-VOICE-01 — Registro de perfis conversacionais.
 * Define tom, verbosidade, pausas e estilo — sem alterar permissões ou governança.
 */

const PROFILES = Object.freeze({
  default: {
    id: 'default',
    name: 'Conversacional Padrão',
    tone: 'natural_direct',
    verbosity: 'short',
    pause_profile: {
      silence_ms: 920,
      threshold: 0.52,
      prefix_padding_ms: 480,
      post_done_ms: 500,
      clear_tail_ms: 200,
      response_delay_ms: 380,
      defer_response_create: true,
      adaptive_vad: true
    },
    detail_level: 'balanced',
    panel_behavior: 'on_request',
    speech_profile: {
      max_sentences: 2,
      speed: 0.9,
      max_response_tokens: 420
    },
    context_priority: 10
  },

  operational: {
    id: 'operational',
    name: 'Contexto Operacional',
    tone: 'direct_operational',
    verbosity: 'minimal',
    pause_profile: {
      silence_ms: 780,
      threshold: 0.51,
      prefix_padding_ms: 420,
      post_done_ms: 420,
      clear_tail_ms: 180,
      response_delay_ms: 220,
      defer_response_create: true,
      adaptive_vad: true
    },
    detail_level: 'action_focused',
    panel_behavior: 'on_request',
    speech_profile: {
      max_sentences: 2,
      speed: 0.92,
      max_response_tokens: 320
    },
    context_priority: 40
  },

  technical: {
    id: 'technical',
    name: 'Contexto Técnico',
    tone: 'precise_technical',
    verbosity: 'normal',
    pause_profile: {
      silence_ms: 960,
      threshold: 0.52,
      prefix_padding_ms: 500,
      post_done_ms: 520,
      clear_tail_ms: 220,
      response_delay_ms: 420,
      defer_response_create: true,
      adaptive_vad: true
    },
    detail_level: 'procedural',
    panel_behavior: 'proactive_when_relevant',
    speech_profile: {
      max_sentences: 3,
      speed: 0.88,
      max_response_tokens: 520
    },
    context_priority: 50
  },

  executive: {
    id: 'executive',
    name: 'Contexto Executivo',
    tone: 'executive_strategic',
    verbosity: 'short',
    pause_profile: {
      silence_ms: 980,
      threshold: 0.52,
      prefix_padding_ms: 500,
      post_done_ms: 560,
      clear_tail_ms: 240,
      response_delay_ms: 400,
      defer_response_create: true,
      adaptive_vad: false
    },
    detail_level: 'strategic_summary',
    panel_behavior: 'on_request',
    speech_profile: {
      max_sentences: 2,
      speed: 0.88,
      max_response_tokens: 380
    },
    context_priority: 70
  },

  meeting: {
    id: 'meeting',
    name: 'Contexto Reunião',
    tone: 'calm_formal',
    verbosity: 'minimal',
    pause_profile: {
      silence_ms: 1020,
      threshold: 0.53,
      prefix_padding_ms: 520,
      post_done_ms: 650,
      clear_tail_ms: 280,
      response_delay_ms: 0,
      defer_response_create: false,
      adaptive_vad: false
    },
    detail_level: 'summary',
    panel_behavior: 'on_request',
    speech_profile: {
      max_sentences: 1,
      speed: 0.88,
      max_response_tokens: 120
    },
    context_priority: 85
  },

  presentation: {
    id: 'presentation',
    name: 'Contexto Apresentação',
    tone: 'presentation_formal',
    verbosity: 'minimal',
    pause_profile: {
      silence_ms: 1000,
      threshold: 0.53,
      prefix_padding_ms: 510,
      post_done_ms: 620,
      clear_tail_ms: 260,
      response_delay_ms: 0,
      defer_response_create: false,
      adaptive_vad: false
    },
    detail_level: 'presentation_safe',
    panel_behavior: 'on_request',
    speech_profile: {
      max_sentences: 1,
      speed: 0.86,
      max_response_tokens: 140
    },
    context_priority: 88
  },

  executive_briefing: {
    id: 'executive_briefing',
    name: 'Briefing Executivo',
    tone: 'executive_briefing',
    verbosity: 'short',
    pause_profile: {
      silence_ms: 960,
      threshold: 0.52,
      prefix_padding_ms: 490,
      post_done_ms: 540,
      clear_tail_ms: 220,
      response_delay_ms: 350,
      defer_response_create: true,
      adaptive_vad: false
    },
    detail_level: 'strategic_summary',
    panel_behavior: 'proactive_when_relevant',
    speech_profile: {
      max_sentences: 2,
      speed: 0.87,
      max_response_tokens: 360
    },
    context_priority: 82
  },

  strategic_analysis: {
    id: 'strategic_analysis',
    name: 'Análise Estratégica',
    tone: 'analytical_executive',
    verbosity: 'normal',
    pause_profile: {
      silence_ms: 940,
      threshold: 0.52,
      prefix_padding_ms: 480,
      post_done_ms: 520,
      clear_tail_ms: 210,
      response_delay_ms: 400,
      defer_response_create: true,
      adaptive_vad: false
    },
    detail_level: 'aggregated',
    panel_behavior: 'proactive_when_relevant',
    speech_profile: {
      max_sentences: 3,
      speed: 0.87,
      max_response_tokens: 480
    },
    context_priority: 75
  },

  boardroom: {
    id: 'boardroom',
    name: 'Boardroom Executivo',
    tone: 'boardroom_executive',
    verbosity: 'short',
    pause_profile: {
      silence_ms: 980,
      threshold: 0.53,
      prefix_padding_ms: 500,
      post_done_ms: 580,
      clear_tail_ms: 250,
      response_delay_ms: 380,
      defer_response_create: true,
      adaptive_vad: false
    },
    detail_level: 'boardroom_consolidated',
    panel_behavior: 'on_request',
    speech_profile: {
      max_sentences: 2,
      speed: 0.86,
      max_response_tokens: 400
    },
    context_priority: 90
  }
});

function getProfile(profileId) {
  const id = String(profileId || 'default').trim().toLowerCase();
  return PROFILES[id] ? { ...PROFILES[id] } : { ...PROFILES.default };
}

function listProfileIds() {
  return Object.keys(PROFILES);
}

module.exports = {
  PROFILES,
  getProfile,
  listProfileIds
};
