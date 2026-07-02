/**
 * CERT-VOICE-01 — Cliente do Conversation Context Engine.
 * Resolve perfil conversacional por interação (não global por build).
 */
import { dashboard } from '../services/api';

const LEGACY_MEETING_PROFILE = {
  id: 'meeting',
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
  speech_profile: {
    max_sentences: 1,
    speed: 0.88,
    max_response_tokens: 120
  }
};

let _lastProfileId = null;
let _lastResolution = null;

function isLegacyMeetingBuildFlag() {
  const v = String(import.meta.env.VITE_REALTIME_MEETING || '').trim().toLowerCase();
  return v === 'true' || v === '1';
}

/**
 * @param {object} [opts]
 * @returns {Promise<object|null>}
 */
export async function resolveConversationContext(opts = {}) {
  const hint = String(opts.hint || opts.queryText || '').trim();
  const channel = String(opts.channel || 'anam_voice').trim();
  const params = {
    channel,
    ...(hint ? { hint: hint.slice(0, 200) } : {}),
    ...(_lastProfileId ? { previousProfileId: _lastProfileId } : {}),
    ...(opts.modoApresentacao ? { modoApresentacao: '1' } : {}),
    ...(opts.executiveBoardroom ? { executiveBoardroom: '1' } : {})
  };

  try {
    const res = await dashboard.getConversationContext(params);
    const data = res?.data;
    if (data?.conversation_profile) {
      if (data.profile_id && data.profile_id !== _lastProfileId) {
        _lastResolution = data;
      }
      _lastProfileId = data.profile_id || data.conversation_profile?.id || _lastProfileId;
      return data;
    }
    const nested = res?.data?.conversation_context;
    if (nested?.conversation_profile) {
      _lastProfileId = nested.profile_id || nested.conversation_profile?.id || _lastProfileId;
      return nested;
    }
  } catch (e) {
    console.warn('[conversationContextClient] resolve', e?.message || e);
  }

  if (isLegacyMeetingBuildFlag()) {
    return {
      profile_id: 'meeting',
      context_type: 'executive',
      subcontext: 'meeting',
      conversation_profile: LEGACY_MEETING_PROFILE,
      legacy_fallback: true
    };
  }

  return null;
}

/**
 * Extrai perfil de resposta voice-realtime-context (já inclui conversation_context).
 * @param {object} voiceRealtimePayload res.data do getVoiceRealtimeContext
 */
export function extractProfileFromVoiceContext(voiceRealtimePayload) {
  const cc = voiceRealtimePayload?.conversation_context;
  if (cc?.conversation_profile) {
    if (cc.profile_id) _lastProfileId = cc.profile_id;
    return cc;
  }
  return null;
}

export function getLastConversationProfileId() {
  return _lastProfileId;
}

export function resetConversationContextSession() {
  _lastProfileId = null;
  _lastResolution = null;
}

/**
 * Mapeia conversation_profile → parâmetros de transporte Realtime (VAD/pausas).
 * @param {object|null} conversationProfile
 */
export function mapProfileToRealtimeTransport(conversationProfile) {
  const profile = conversationProfile?.conversation_profile || conversationProfile;
  if (!profile?.pause_profile) {
    if (isLegacyMeetingBuildFlag()) {
      return {
        ...LEGACY_MEETING_PROFILE.pause_profile,
        speech_profile: LEGACY_MEETING_PROFILE.speech_profile,
        profile_id: 'meeting',
        legacy_fallback: true
      };
    }
    return {
      silence_ms: 920,
      threshold: 0.52,
      prefix_padding_ms: 480,
      post_done_ms: 500,
      clear_tail_ms: 200,
      response_delay_ms: 380,
      defer_response_create: true,
      adaptive_vad: true,
      speech_profile: { max_sentences: 2, speed: 0.9, max_response_tokens: 420 },
      profile_id: 'default'
    };
  }

  return {
    ...profile.pause_profile,
    speech_profile: profile.speech_profile || {},
    profile_id: profile.id || 'default'
  };
}

export { LEGACY_MEETING_PROFILE, isLegacyMeetingBuildFlag };
