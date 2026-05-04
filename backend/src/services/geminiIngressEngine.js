'use strict';

/**
 * Motor de ingress Gemini — 3 modos: passthrough | light | full.
 * Toda a entrada HTTP /api (excepto allowlist administrativa) passa por classificação;
 * passthrough regista e valida sem chamada remota por defeito (custo zero).
 */

const geminiService = require('./geminiService');
const geminiIngressMetrics = require('./geminiIngressMetrics');

function pathOnly(url) {
  return String(url || '').split('?')[0];
}

function isIngressEnabled() {
  return String(process.env.IMPETUS_GEMINI_INGRESS_ENABLED || 'false').toLowerCase() === 'true';
}

function getPassthroughPrefixes() {
  const raw =
    process.env.IMPETUS_GEMINI_PASSTHROUGH_PREFIXES ||
    '/health,/api/health,/api/system/,/api/auth,/api/webhook,/api/webhooks/,/uploads,/favicon,/api/dashboard,/api/live-dashboard,/api/factory-team';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function matchesPassthrough(path) {
  const p = pathOnly(path);
  if (!p.startsWith('/api')) return true;
  return getPassthroughPrefixes().some((pre) => p === pre || p.startsWith(pre));
}

function getSystemStateLabel() {
  try {
    return require('./systemRuntimeState').getSnapshot().status || 'HEALTHY';
  } catch (_e) {
    return 'HEALTHY';
  }
}

function summarizeBody(req) {
  try {
    const b = req.body;
    if (b == null) return '';
    const s = typeof b === 'string' ? b : JSON.stringify(b);
    return String(s).slice(0, 12000);
  } catch (_e) {
    return '';
  }
}

function heuristicFullMode(path, method, requestClass, costScore, preview) {
  const p = pathOnly(path);
  if (requestClass === 'HEAVY') return true;
  if (costScore >= 42) return true;
  if (/cognitive|multimodal|vision|manutencao-ia|technical-library|asset-management/i.test(p)) return true;
  if ((method === 'POST' || method === 'PUT') && preview.length > 8000) return true;
  if (/\b(images|video|sensor|multimodal)\b/i.test(preview)) return true;
  return false;
}

function buildDegradedLightFallback(extra = {}) {
  return {
    mode: 'light',
    degraded: true,
    source: 'fallback',
    ...extra
  };
}

function parseJsonFromModel(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const t = raw.trim();
  try {
    return JSON.parse(t);
  } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

/**
 * Classificação remota Gemini (light vs full + campos).
 */
async function classifyWithGemini({
  path,
  method,
  requestClass,
  costScore,
  systemState,
  bodyPreview,
  forceFull
}) {
  if (!geminiService.isAvailable()) {
    const ctx = buildDegradedLightFallback({
      intent: 'ingress_gemini_unavailable',
      clean_text: bodyPreview.slice(0, 4000),
      structured_data: { preview_truncated: true, path, method },
      priority: forceFull || requestClass === 'HEAVY' ? 'high' : 'normal',
      gemini_unavailable: true
    });
    geminiIngressMetrics.recordIngress(ctx.mode, 0);
    return ctx;
  }

  const tierHint = forceFull ? 'full' : heuristicFullMode(path, method, requestClass, costScore, bodyPreview) ? 'full' : 'light';

  const prompt = `És o motor de ingress IMPETUS. Responde APENAS JSON válido (sem markdown).

Contexto HTTP:
- path: ${pathOnly(path)}
- method: ${method}
- requestClass: ${requestClass}
- costScore: ${costScore}
- systemState: ${systemState}
- tierHint: ${tierHint}

bodyPreview (truncado):
${bodyPreview.slice(0, 7000)}

Regras:
- mode: "light" — chats curtos, perguntas simples, payloads pequenos.
- mode: "full" — council cognitivo, análise, multimodal, payloads grandes, HEAVY, ou systemState DEGRADED com conteúdo operacional.

Campos obrigatórios no JSON:
{
  "mode": "light" | "full",
  "intent": "string curta",
  "clean_text": "texto normalizado do utilizador ou vazio",
  "structured_data": { },
  "priority": "low" | "normal" | "high"
}`;

  const t0 = Date.now();
  const raw = await geminiService.generateText(prompt, {});
  const apiMs = Date.now() - t0;
  const parsed = parseJsonFromModel(raw || '');
  if (!parsed || typeof parsed !== 'object') {
    const ctx = buildDegradedLightFallback({
      mode: tierHint === 'full' ? 'full' : 'light',
      intent: 'ingress_parse_fallback',
      clean_text: bodyPreview.slice(0, 4000),
      structured_data: { parse_error: true },
      priority: tierHint === 'full' ? 'high' : 'normal',
      gemini_parse_failed: true
    });
    geminiIngressMetrics.recordIngress(ctx.mode, apiMs);
    return ctx;
  }

  const mode = parsed.mode === 'full' ? 'full' : 'light';
  const out = {
    mode,
    intent: String(parsed.intent || 'unknown').slice(0, 120),
    clean_text: typeof parsed.clean_text === 'string' ? parsed.clean_text : '',
    structured_data:
      parsed.structured_data && typeof parsed.structured_data === 'object' ? parsed.structured_data : {},
    priority: ['low', 'normal', 'high'].includes(parsed.priority) ? parsed.priority : 'normal'
  };
  geminiIngressMetrics.recordIngress(out.mode, apiMs);
  return out;
}

/**
 * @param {import('express').Request} req
 */
async function processHttpIngress(req) {
  const enabled = isIngressEnabled();
  const path = String(req.originalUrl || req.url || '');
  const method = String(req.method || 'GET').toUpperCase();
  const requestClass = req.impetusRequestClass || 'NORMAL';
  const costScore = typeof req.impetusRequestCostScore === 'number' ? req.impetusRequestCostScore : 0;
  const systemState = getSystemStateLabel();
  const registeredAt = new Date().toISOString();
  const preview = summarizeBody(req);

  if (!enabled) {
    const ctx = {
      mode: 'disabled',
      validated: false,
      registered_at: registeredAt,
      path: pathOnly(path),
      method,
      note: 'IMPETUS_GEMINI_INGRESS_ENABLED=false'
    };
    geminiIngressMetrics.recordIngress('disabled', 0);
    return ctx;
  }

  if (method === 'OPTIONS') {
    const ctx = {
      mode: 'passthrough',
      validated: true,
      validation_source: 'http_options',
      registered_at: registeredAt
    };
    geminiIngressMetrics.recordIngress('passthrough', 0);
    return ctx;
  }

  if (matchesPassthrough(path)) {
    const callApi = String(process.env.IMPETUS_GEMINI_PASSTHROUGH_CALL_API || '').toLowerCase() === 'true';
    if (!callApi) {
      const ctx = {
        mode: 'passthrough',
        validated: true,
        validation_source: 'route_prefix_allowlist',
        registered_at: registeredAt,
        path: pathOnly(path),
        method,
        request_class: requestClass,
        system_state: systemState
      };
      geminiIngressMetrics.recordIngress('passthrough', 0);
      return ctx;
    }
    const forced = await classifyWithGemini({
      path,
      method,
      requestClass,
      costScore,
      systemState,
      bodyPreview: preview || '{}',
      forceFull: false
    });
    return {
      ...forced,
      mode: 'passthrough',
      gemini_overlay: true,
      registered_at: registeredAt,
      path: pathOnly(path),
      method
    };
  }

  const forceFull =
    heuristicFullMode(path, method, requestClass, costScore, preview) || systemState === 'DEGRADED';

  const classified = await classifyWithGemini({
    path,
    method,
    requestClass,
    costScore,
    systemState,
    bodyPreview: preview || '{}',
    forceFull
  });

  return {
    ...classified,
    registered_at: registeredAt,
    path: pathOnly(path),
    method,
    request_class: requestClass,
    cost_score: costScore,
    system_state: systemState
  };
}

function estimateCostFromPreview(s) {
  return Math.min(100, Math.floor(String(s || '').length / 500));
}

/**
 * Entrada fora de HTTP (socket, jobs): devolve o mesmo contrato que req.geminiContext.
 * Usar dentro de runWithRequestContext({ geminiIngress: await runGeminiIngressForContext(...) }, ...).
 */
async function runGeminiIngressForContext(payload = {}) {
  const path = payload.path || '/internal/worker';
  const method = payload.method || 'POST';
  const bodyPreview =
    typeof payload.bodyPreview === 'string'
      ? payload.bodyPreview
      : JSON.stringify(payload.body || payload.input || {}).slice(0, 12000);
  const requestClass = payload.requestClass || 'NORMAL';
  const costScore =
    typeof payload.costScore === 'number' ? payload.costScore : estimateCostFromPreview(bodyPreview);
  const source = payload.source || 'worker';
  const registeredAt = new Date().toISOString();
  const systemState = getSystemStateLabel();

  if (!isIngressEnabled()) {
    geminiIngressMetrics.recordIngress('disabled', 0);
    return {
      mode: 'disabled',
      validated: false,
      registered_at: registeredAt,
      path: pathOnly(path),
      method,
      source
    };
  }

  if (matchesPassthrough(path)) {
    geminiIngressMetrics.recordIngress('passthrough', 0);
    return {
      mode: 'passthrough',
      validated: true,
      validation_source: 'context_allowlist',
      registered_at: registeredAt,
      path: pathOnly(path),
      method,
      request_class: requestClass,
      system_state: systemState,
      source
    };
  }

  const forceFull =
    heuristicFullMode(path, method, requestClass, costScore, bodyPreview) || systemState === 'DEGRADED';

  const classified = await classifyWithGemini({
    path,
    method,
    requestClass,
    costScore,
    systemState,
    bodyPreview: bodyPreview || '{}',
    forceFull
  });

  return {
    ...classified,
    registered_at: registeredAt,
    path: pathOnly(path),
    method,
    request_class: requestClass,
    cost_score: costScore,
    system_state: systemState,
    source
  };
}

/** Para IMPETUS_ENFORCE_GEMINI_INGRESS — ingress válido para prosseguir para Claude/GPT. */
function hasValidGeminiIngress(gi) {
  if (!gi || typeof gi !== 'object') return false;
  if (gi.mode === 'disabled') return false;
  if (gi.ingress_error) return false;
  if (gi.mode === 'skipped') return false;
  const okModes = ['passthrough', 'light', 'full'];
  if (!okModes.includes(gi.mode)) return false;
  return !!(gi.registered_at || gi.validated);
}

module.exports = {
  isIngressEnabled,
  processHttpIngress,
  matchesPassthrough,
  getPassthroughPrefixes,
  runGeminiIngressForContext,
  hasValidGeminiIngress,
  classifyWithGemini
};
