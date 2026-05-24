'use strict';

const ANAM_API_BASE = String(process.env.ANAM_API_BASE || 'https://api.anam.ai').replace(/\/$/, '');
const {
  buildAnamSessionContextPrompt,
  buildAnamOpeningLine
} = require('../utils/anamSessionContext');
const voiceRealtimeContextService = require('./voiceRealtimeContextService');
const { buildChatUserContext } = require('./chatUserContext');

/** Persona válida na conta (Liv) — substitui UUID inexistente do Anam Lab antigo. */
const DEFAULT_PERSONA_ID = 'cdc1721e-a936-4fe2-b34d-ac804cfc1c27';

/** Cache em memória — evita bater na API Anam a cada abertura do overlay. */
const sessionTokenCache = new Map();
let personasCache = { at: 0, list: null };
let personaGreetingPatched = false;

function cacheKey(clientLabel, personaId, sessionContext) {
  const hour =
    sessionContext && Number.isFinite(Number(sessionContext.localHour))
      ? Number(sessionContext.localHour)
      : '';
  const name = String(sessionContext?.userDisplayName || '')
    .trim()
    .slice(0, 40);
  const opening = buildAnamOpeningLine(sessionContext || {}).slice(0, 48);
  return `greet-v4-data:${String(clientLabel || 'default')}:${String(personaId || '')}:${hour}:${name}:${opening}`;
}

function readCachedToken(key) {
  const row = sessionTokenCache.get(key);
  if (!row) return null;
  const skewMs = 90_000;
  if (row.expiresAt <= Date.now() + skewMs) {
    sessionTokenCache.delete(key);
    return null;
  }
  return row;
}

/** Liberta slot Anam — invalida tokens em cache antes de nova ligação WebRTC. */
function clearSessionTokenCache(clientLabelPrefix) {
  const prefix = String(clientLabelPrefix || '').trim();
  if (!prefix) {
    const n = sessionTokenCache.size;
    sessionTokenCache.clear();
    return { cleared: n };
  }
  let n = 0;
  for (const key of sessionTokenCache.keys()) {
    if (key.startsWith(prefix)) {
      sessionTokenCache.delete(key);
      n += 1;
    }
  }
  return { cleared: n };
}

function isConfigured() {
  return Boolean(String(process.env.ANAM_API_KEY || '').trim());
}

function resolvePersonaId(override) {
  const id = String(override || process.env.ANAM_PERSONA_ID || DEFAULT_PERSONA_ID).trim();
  return id || DEFAULT_PERSONA_ID;
}

async function fetchPersonas() {
  const apiKey = String(process.env.ANAM_API_KEY || '').trim();
  if (!apiKey) return [];

  const now = Date.now();
  if (personasCache.list && now - personasCache.at < 5 * 60_000) {
    return personasCache.list;
  }

  try {
    const res = await fetch(`${ANAM_API_BASE}/v1/personas`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' }
    });
    const data = await res.json().catch(() => ({}));
    const list = Array.isArray(data?.data) ? data.data : [];
    personasCache = { at: now, list };
    return list;
  } catch (e) {
    console.warn('[anam] list personas failed', e.message);
    return personasCache.list || [];
  }
}

/**
 * Garante personaId existente na conta Anam (lista /v1/personas).
 * Aceita personaId ou avatarId (mapeia para persona que usa esse avatar).
 */
/**
 * Desativa saudação automática da persona Liv no Anam Lab (LLM improvisa "impulsionar", etc.).
 * Corre uma vez por processo; sessão usa skipGreeting + talk() no browser com frase IMPETUS.
 */
async function ensurePersonaSkipLabGreeting(personaId) {
  if (personaGreetingPatched) return;
  const apiKey = String(process.env.ANAM_API_KEY || '').trim();
  if (!apiKey || !personaId) return;
  try {
    const res = await fetch(`${ANAM_API_BASE}/v1/personas/${personaId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        skipGreeting: true,
        initialMessage: null,
        uninterruptibleGreeting: false
      })
    });
    if (res.ok) {
      personaGreetingPatched = true;
      console.info('[anam] persona skipGreeting ativado no Anam Lab');
    } else {
      const data = await res.json().catch(() => ({}));
      console.warn('[anam] persona skipGreeting PATCH', res.status, data.message || data.error);
    }
  } catch (e) {
    console.warn('[anam] persona skipGreeting PATCH failed', e.message);
  }
}

async function resolveValidPersonaId(override) {
  const requested = resolvePersonaId(override);
  const personas = await fetchPersonas();
  if (!personas.length) {
    return requested === 'aaabd0a5-5976-4fc2-b9f7-50fc1478397e' ? DEFAULT_PERSONA_ID : requested;
  }

  const byId = personas.find((p) => p.id === requested);
  if (byId) return byId.id;

  const byAvatar = personas.find((p) => p.avatar?.id === requested);
  if (byAvatar) return byAvatar.id;

  const fallback = personas[0]?.id || DEFAULT_PERSONA_ID;
  if (requested !== fallback) {
    console.warn(
      `[anam] persona ${requested} não encontrada; a usar ${fallback} (${personas[0]?.name || 'default'})`
    );
  }
  return fallback;
}

/**
 * Prompt de sistema Anam: identidade + KPIs/dados IMPETUS + regras de sessão.
 * @param {object} [user] req.user
 * @param {object} [sessionCtx]
 */
async function buildAnamSystemPrompt(user, sessionCtx = {}) {
  const parts = [];
  if (user?.id) {
    try {
      const chatCtx = await buildChatUserContext(user);
      if (chatCtx?.identityBlock) parts.push(chatCtx.identityBlock);
      if (chatCtx?.memoriaBlock) parts.push(chatCtx.memoriaBlock);
    } catch (e) {
      console.warn('[anam] chat context', e.message);
    }
    try {
      const voiceCtx = await voiceRealtimeContextService.buildVoiceRealtimeContext(user, {
        channel: 'anam_voice',
        forceOperationalSnapshot: true,
        queryText: ''
      });
      if (voiceCtx?.instructions_append) parts.push(voiceCtx.instructions_append);
    } catch (e) {
      console.warn('[anam] voice operational context', e.message);
    }
  }
  const sessionPrompt = buildAnamSessionContextPrompt(sessionCtx);
  if (sessionPrompt) parts.push(sessionPrompt);
  const envPrompt = String(process.env.ANAM_SYSTEM_PROMPT_APPEND || '').trim();
  if (envPrompt) parts.push(envPrompt);
  const merged = parts.filter(Boolean).join('\n\n');
  const maxLen = 28000;
  return merged.length > maxLen ? `${merged.slice(0, maxLen)}\n[contexto truncado]` : merged;
}

/**
 * Token de sessão Anam para o SDK no browser (persona já criada no Anam Lab).
 * @param {{ personaId?: string, clientLabel?: string, user?: object, sessionContext?: { userDisplayName?: string, localHour?: number, timezone?: string } }} [opts]
 */
async function createSessionToken(opts = {}) {
  const apiKey = String(process.env.ANAM_API_KEY || '').trim();
  if (!apiKey) {
    const err = new Error('ANAM_API_KEY não configurada no servidor.');
    err.code = 'ANAM_NOT_CONFIGURED';
    throw err;
  }

  const personaId = await resolveValidPersonaId(opts.personaId);
  await ensurePersonaSkipLabGreeting(personaId);
  const clientLabel = String(opts.clientLabel || 'impetus-voice-overlay').slice(0, 120);
  const key = cacheKey(clientLabel, personaId, opts.sessionContext);
  const cached = readCachedToken(key);
  if (cached) {
    return {
      sessionToken: cached.sessionToken,
      personaId,
      expiresInSeconds: Math.max(60, Math.floor((cached.expiresAt - Date.now()) / 1000)),
      cached: true
    };
  }

  const sessionCtx = opts.sessionContext || {};
  const systemPromptAppend = await buildAnamSystemPrompt(opts.user, sessionCtx);

  async function requestToken(personaConfig) {
    const res = await fetch(`${ANAM_API_BASE}/v1/auth/session-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        clientLabel,
        personaConfig
      })
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  let personaConfig = {
    personaId,
    /* skipGreeting: true — sem saudação LLM do Lab; o browser fala só via talk() com openingLine. */
    skipGreeting: true
  };
  if (systemPromptAppend) {
    personaConfig.systemPrompt = systemPromptAppend;
  }

  let { res, data } = await requestToken(personaConfig);

  if (!res.ok && (res.status === 404 || res.status === 400)) {
    const avatarId = String(opts.personaId || process.env.ANAM_PERSONA_ID || '').trim();
    const voiceId = String(process.env.ANAM_VOICE_ID || '').trim();
    const llmId = String(process.env.ANAM_LLM_ID || '').trim();
    if (avatarId && voiceId && llmId) {
      personaConfig = {
        name: String(process.env.ANAM_PERSONA_NAME || 'Impetus').trim() || 'Impetus',
        avatarId,
        voiceId,
        llmId,
        skipGreeting: true,
        systemPrompt:
          systemPromptAppend ||
          'Assistente operacional IMPETUS. Responda em português do Brasil, tom profissional e claro.'
      };
      ({ res, data } = await requestToken(personaConfig));
    }
  }

  if (!res.ok) {
    const stale = res.status === 429 ? readCachedToken(key) : null;
    if (stale) {
      return {
        sessionToken: stale.sessionToken,
        personaId,
        expiresInSeconds: Math.max(60, Math.floor((stale.expiresAt - Date.now()) / 1000)),
        cached: true
      };
    }
    const err = new Error(
      data.message || data.error || `Anam API ${res.status}: falha ao criar session token`
    );
    err.code = res.status === 429 ? 'ANAM_RATE_LIMIT' : 'ANAM_API_ERROR';
    err.status = res.status;
    err.details = data;
    if (res.status === 429) {
      err.message =
        'Limite de pedidos da API Anam (429). Aguarde alguns minutos ou verifique o plano no Anam Lab.';
    }
    throw err;
  }

  const sessionToken = data.sessionToken || data.session_token;
  if (!sessionToken) {
    const err = new Error('Resposta Anam sem sessionToken.');
    err.code = 'ANAM_INVALID_RESPONSE';
    throw err;
  }

  const expiresInSeconds = data.expiresInSeconds ?? data.expires_in_seconds ?? 3600;
  sessionTokenCache.set(key, {
    sessionToken,
    expiresAt: Date.now() + Math.max(300, Number(expiresInSeconds) || 3600) * 1000
  });

  return {
    sessionToken,
    personaId,
    expiresInSeconds
  };
}

async function getPublicConfig() {
  const hasApiKey = isConfigured();
  let personaId = resolvePersonaId();
  let personaName = null;
  if (hasApiKey) {
    personaId = await resolveValidPersonaId();
    const personas = await fetchPersonas();
    personaName = personas.find((p) => p.id === personaId)?.name || null;
  }
  return {
    enabled: hasApiKey,
    personaId,
    personaName,
    hasApiKey,
    reason: hasApiKey ? null : 'ANAM_API_KEY ausente no servidor'
  };
}

module.exports = {
  createSessionToken,
  buildAnamSystemPrompt,
  getPublicConfig,
  isConfigured,
  resolvePersonaId,
  resolveValidPersonaId,
  fetchPersonas,
  clearSessionTokenCache,
  DEFAULT_PERSONA_ID
};
