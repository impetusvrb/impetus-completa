'use strict';

/**
 * Sondagem de conectividade das integrações de IA (OpenAI, Anthropic, Google/Gemini, Akool).
 * Usado por GET /health (modo detalhe) e por aiProviderService (cartões Nexus / traces).
 * Resultados em cache TTL para não multiplicar pedidos externos.
 */

const axios = require('axios');

const DEFAULT_CACHE_TTL_MS = Math.max(
  5000,
  Math.min(120000, parseInt(process.env.AI_HEALTH_CACHE_TTL_MS || '45000', 10) || 45000)
);

let cache = { at: 0, data: null };
/** Evita várias sondagens paralelas no primeiro miss de cache. */
let inflight = null;

function normalizeAnthropicKey() {
  return (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '').trim();
}

async function openaiProbe() {
  const key = (process.env.OPENAI_API_KEY || '').trim();
  if (!key) {
    return { status: 'down', configured: false, detail: 'OPENAI_API_KEY ausente' };
  }
  try {
    const { status } = await axios.get('https://api.openai.com/v1/models?limit=1', {
      headers: { Authorization: `Bearer ${key}` },
      timeout: 8000,
      validateStatus: () => true
    });
    const ok = status >= 200 && status < 300;
    return {
      status: ok ? 'up' : 'down',
      configured: true,
      detail: ok ? undefined : `OpenAI HTTP ${status}`
    };
  } catch (e) {
    return { status: 'down', configured: true, detail: e.message || String(e) };
  }
}

async function anthropicProbe() {
  const key = normalizeAnthropicKey();
  if (!key) {
    return { status: 'down', configured: false, detail: 'ANTHROPIC_API_KEY ausente' };
  }
  try {
    const { status } = await axios.get('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      timeout: 8000,
      validateStatus: () => true
    });
    const ok = status >= 200 && status < 300;
    return {
      status: ok ? 'up' : 'down',
      configured: true,
      detail: ok ? undefined : `Anthropic HTTP ${status}`
    };
  } catch (e) {
    return { status: 'down', configured: true, detail: e.message || String(e) };
  }
}

async function googleVertexProbe() {
  const geminiService = require('./geminiService');
  if (!geminiService.isAvailable()) {
    return {
      status: 'down',
      configured: false,
      detail: 'Google Gemini / Vertex não configurado (API key ou projeto)'
    };
  }
  const model =
    (process.env.GEMINI_MODEL || process.env.GEMINI_SUPERVISOR_MODEL || 'gemini-2.5-flash').trim();
  try {
    const out = await Promise.race([
      geminiService.generateText('ping', { model }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout Gemini')), 12000))
    ]);
    const ok = out != null && String(out).trim().length > 0;
    return {
      status: ok ? 'up' : 'down',
      configured: true,
      detail: ok ? undefined : 'Gemini sem texto de resposta'
    };
  } catch (e) {
    return { status: 'down', configured: true, detail: e.message || String(e) };
  }
}

async function akoolProbe() {
  const key = (process.env.AKOOL_API_KEY || process.env.AKOOL_TOKEN || '').trim();
  const renderUrl = (process.env.AKOOL_RENDER_URL || '').trim();
  if (!key) {
    return { status: 'down', configured: false, detail: 'AKOOL_API_KEY ausente' };
  }
  let target;
  try {
    target = renderUrl ? new URL(renderUrl).origin : 'https://akool.com';
  } catch (_) {
    target = 'https://akool.com';
  }
  try {
    await axios.get(target, {
      timeout: 6000,
      maxRedirects: 5,
      validateStatus: () => true,
      responseType: 'text'
    });
    return {
      status: 'up',
      configured: true,
      detail: renderUrl ? undefined : 'AKOOL_RENDER_URL não definido — só rede base verificada'
    };
  } catch (e) {
    return { status: 'down', configured: true, detail: e.message || String(e) };
  }
}

/**
 * @param {{ forceRefresh?: boolean }} [opts]
 * @returns {Promise<object>}
 */
async function getAiIntegrationsHealth(opts = {}) {
  const now = Date.now();
  if (!opts.forceRefresh && cache.data && now - cache.at < DEFAULT_CACHE_TTL_MS) {
    return { ...cache.data, from_cache: true };
  }
  if (!opts.forceRefresh && inflight) {
    return inflight;
  }

  const run = (async () => {
    const [openai, anthropic, google_vertex, akool] = await Promise.all([
      openaiProbe(),
      anthropicProbe(),
      googleVertexProbe(),
      akoolProbe()
    ]);

    const data = {
      schema_version: 'ai_integrations_health_v1',
      probed_at: new Date().toISOString(),
      cache_ttl_ms: DEFAULT_CACHE_TTL_MS,
      openai,
      anthropic,
      google_vertex,
      akool
    };
    cache = { at: Date.now(), data };
    return { ...data, from_cache: false };
  })();

  if (!opts.forceRefresh) {
    inflight = run.finally(() => {
      inflight = null;
    });
    return inflight;
  }

  return run;
}

/** Mapeia chave canónica do catálogo (openai | anthropic | google_vertex | akool) para entrada de health. */
function healthEntryForProviderKey(providerKey, health) {
  const k = String(providerKey || '').toLowerCase();
  if (k === 'openai') return health.openai;
  if (k === 'anthropic' || k === 'claude') return health.anthropic;
  if (k === 'google_vertex' || k === 'google' || k === 'gemini' || k === 'vertex') return health.google_vertex;
  if (k === 'akool') return health.akool;
  return health.openai;
}

function isLiveUp(providerKey, health) {
  const e = healthEntryForProviderKey(providerKey, health);
  return !!(e && e.status === 'up');
}

/** Credenciais presentes (sem sondagem) — compatível com lógica anterior. */
function credentialsConfigured(providerKey) {
  const k = String(providerKey || '').toLowerCase();
  if (k === 'openai') return !!(process.env.OPENAI_API_KEY || '').trim();
  if (k === 'anthropic' || k === 'claude') return !!normalizeAnthropicKey();
  if (k === 'google_vertex' || k === 'google' || k === 'gemini' || k === 'vertex') {
    const api = !!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '').trim();
    const vx = String(process.env.GOOGLE_GENAI_USE_VERTEXAI || '').toLowerCase();
    if (vx === 'true' || vx === '1') {
      return !!(process.env.GOOGLE_CLOUD_PROJECT || '').trim();
    }
    return api;
  }
  if (k === 'akool') return !!(process.env.AKOOL_API_KEY || process.env.AKOOL_TOKEN || '').trim();
  return false;
}

function operationalLabel(providerKey, health) {
  const live = isLiveUp(providerKey, health);
  if (live) return 'Operacional (sondagem /health)';
  const creds = credentialsConfigured(providerKey);
  if (creds) return 'Credenciais OK — sondagem falhou ou serviço indisponível';
  return 'Indisponível / não configurado';
}

module.exports = {
  getAiIntegrationsHealth,
  healthEntryForProviderKey,
  isLiveUp,
  credentialsConfigured,
  operationalLabel
};
