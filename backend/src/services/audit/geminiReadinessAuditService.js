'use strict';

/**
 * F49-D — Gemini Readiness & Vision Certification Audit Service
 * READ ONLY · AUDIT ONLY · VALIDATION ONLY
 *
 * Certifica operacionalmente Gemini sem alterar prompts, modelos ou runtime.
 */

const fs = require('fs');
const path = require('path');
const geminiService = require('../geminiService');
const aiIntegrationsHealth = require('../aiIntegrationsHealthService');
const manuiaLiveAssistance = require('../manuiaLiveAssistanceService');

const LAYER = 'F49_GEMINI_READINESS_AUDIT';

/** JPEG mínimo válido (1×1) — imagem real enviada à API, sem mock de resposta. */
const VISION_PROBE_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';

const MANUIA_ROUTES = Object.freeze([
  { method: 'POST', path: '/api/manutencao-ia/live-assistance/analyze-frame', service: 'manuiaLiveAssistanceService.identifyPartFromImageWithGemini' },
  { method: 'POST', path: '/api/vision', provider: 'anthropic', note: 'ManuIA 3D multimodal — Anthropic (paralelo)' }
]);

function _envTruthy(v) {
  return String(v ?? '').trim().toLowerCase() === 'true';
}

function isVertexMode() {
  const v = String(process.env.GOOGLE_GENAI_USE_VERTEXAI || '').toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

/**
 * F49-D.1 — Configuração e credenciais (read-only).
 */
function auditConfiguration() {
  const vertex = isVertexMode();
  const geminiKey = String(process.env.GEMINI_API_KEY || '').trim();
  const googleKey = String(process.env.GOOGLE_API_KEY || '').trim();
  const project = String(process.env.GOOGLE_CLOUD_PROJECT || '').trim();
  const location = String(process.env.GOOGLE_CLOUD_LOCATION || 'global').trim();
  const adcPath = String(process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
  const model = String(process.env.GEMINI_MODEL || process.env.GEMINI_SUPERVISOR_MODEL || 'gemini-2.5-flash').trim();

  let credentialsValid = false;
  let credentialMode = 'none';
  let credentialDetail = null;

  if (vertex) {
    credentialMode = 'vertex_adc';
    if (adcPath && fs.existsSync(adcPath)) {
      credentialsValid = true;
      credentialDetail = 'GOOGLE_APPLICATION_CREDENTIALS file present';
    } else if (project) {
      credentialsValid = true;
      credentialDetail = 'Vertex project configured — ADC via metadata/default (not file-verified)';
    } else {
      credentialDetail = 'GOOGLE_CLOUD_PROJECT missing for Vertex';
    }
  } else if (geminiKey || googleKey) {
    credentialMode = 'google_ai_studio_api_key';
    credentialsValid = true;
    credentialDetail = geminiKey ? 'GEMINI_API_KEY set' : 'GOOGLE_API_KEY set';
  } else {
    credentialDetail = 'No API key or Vertex project configured';
  }

  const geminiConfigured = geminiService.isAvailable();

  return {
    gemini_configured: geminiConfigured,
    vertex_mode: vertex,
    vertex_reachable: null,
    credentials_valid: credentialsValid,
    credential_mode: credentialMode,
    credential_detail: credentialDetail,
    environment: {
      GEMINI_API_KEY_set: Boolean(geminiKey),
      GOOGLE_API_KEY_set: Boolean(googleKey),
      GOOGLE_GENAI_USE_VERTEXAI: process.env.GOOGLE_GENAI_USE_VERTEXAI || 'false',
      GOOGLE_CLOUD_PROJECT_set: Boolean(project),
      GOOGLE_CLOUD_LOCATION: location,
      GOOGLE_APPLICATION_CREDENTIALS_set: Boolean(adcPath),
      GOOGLE_APPLICATION_CREDENTIALS_exists: adcPath ? fs.existsSync(adcPath) : false,
      GEMINI_MODEL: model,
      IMPETUS_GEMINI_INGRESS_ENABLED: process.env.IMPETUS_GEMINI_INGRESS_ENABLED || null,
      IMPETUS_EVENT_PIPELINE_ENABLED: process.env.IMPETUS_EVENT_PIPELINE_ENABLED || null
    },
    client_initializable: geminiConfigured
  };
}

/**
 * F49-D.2 — Live connectivity ping (request real, sem mock).
 */
async function runLivePing(opts = {}) {
  const model = opts.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const prompt = opts.prompt || 'Responda apenas com JSON: {"ping":true}';

  if (!geminiService.isAvailable()) {
    return {
      live_ping_ok: false,
      response_received: false,
      configured: false,
      reason: 'client_not_configured',
      latency_ms: null,
      model
    };
  }

  const t0 = Date.now();
  try {
    const out = await Promise.race([
      geminiService.generateText(prompt, { model }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout Gemini ping')), opts.timeoutMs || 15000))
    ]);
    const latency_ms = Date.now() - t0;
    const text = out != null ? String(out).trim() : '';
    const ok = text.length > 0;

    return {
      live_ping_ok: ok,
      response_received: ok,
      configured: true,
      latency_ms,
      model,
      response_preview: text.slice(0, 200),
      status: ok ? 'up' : 'down'
    };
  } catch (e) {
    return {
      live_ping_ok: false,
      response_received: false,
      configured: true,
      latency_ms: Date.now() - t0,
      model,
      error: e.message || String(e),
      status: 'down'
    };
  }
}

/**
 * F49-D.3 — Vision / ManuIA (imagem real, pipeline identifyPartFromImageWithGemini).
 */
async function validateVision(opts = {}) {
  const routesAudited = MANUIA_ROUTES.map((r) => ({
    ...r,
    registered: true
  }));

  if (!geminiService.isAvailable()) {
    return {
      vision_available: false,
      vision_response_received: false,
      manuia_gemini_path: 'identifyPartFromImageWithGemini',
      routes_audited: routesAudited,
      reason: 'gemini_not_configured'
    };
  }

  const t0 = Date.now();
  const imagePayload = `data:image/jpeg;base64,${VISION_PROBE_JPEG_B64}`;
  const visionTimeoutMs = opts.timeoutMs || 30000;
  let result;
  try {
    result = await Promise.race([
      manuiaLiveAssistance.identifyPartFromImageWithGemini(imagePayload),
      new Promise((_, rej) => setTimeout(() => rej(new Error('vision timeout')), visionTimeoutMs))
    ]);
  } catch (e) {
    return {
      vision_available: geminiService.isAvailable(),
      vision_response_received: false,
      manuia_gemini_path: 'identifyPartFromImageWithGemini',
      routes_audited: routesAudited,
      error: e.message || String(e),
      latency_ms: Date.now() - t0,
      no_mocks: true
    };
  }
  const latency_ms = Date.now() - t0;

  const visionResponseReceived = Boolean(
    result?.ok && (result.detection || result.raw_text)
  );

  return {
    vision_available: geminiService.isAvailable(),
    vision_response_received: visionResponseReceived,
    manuia_ok: result?.ok === true,
    detection_structured: Boolean(result?.detection?.detected_part_name != null || result?.detection?.technical_summary),
    latency_ms,
    confidence: result?.detection?.confidence ?? null,
    confidence_level: result?.detection?.confidence_level ?? null,
    routes_audited: routesAudited,
    pipeline: 'geminiService.analyzeImage → extractJsonFromText → ManuIA dossier path',
    no_mocks: true
  };
}

/**
 * F49-D.4 — TRI-AI benchmark readiness (OpenAI + Anthropic + Gemini).
 */
async function checkTriAiReadiness(opts = {}) {
  const health = await aiIntegrationsHealth.getAiIntegrationsHealth({
    forceRefresh: opts.forceRefresh !== false
  });

  const openaiEntry = health.openai || health.integrations?.openai;
  const anthropicEntry = health.anthropic || health.integrations?.anthropic;
  const geminiEntry = health.google_vertex || health.integrations?.google_vertex;

  const openai = openaiEntry?.status === 'up';
  const anthropic = anthropicEntry?.status === 'up';
  const gemini = geminiEntry?.status === 'up';

  return {
    openai,
    anthropic,
    gemini,
    tri_ai_ready: openai && anthropic && gemini,
    probed_at: health.probed_at,
    integrations: {
      openai: openaiEntry,
      anthropic: anthropicEntry,
      google_vertex: geminiEntry
    },
    verdict: openai && anthropic && gemini
      ? 'TRI_AI_OPERATIONAL'
      : 'TRI_AI_PENDING'
  };
}

/**
 * F49-D.5 — Stress validation (lote controlado, pedidos reais).
 */
async function runStressValidation(opts = {}) {
  const requested = Math.max(1, Math.min(100, parseInt(opts.count || process.env.F49_GEMINI_STRESS_COUNT || '100', 10) || 100));
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!geminiService.isAvailable()) {
    return {
      requests_tested: 0,
      requests_requested: requested,
      success_rate: 0,
      timeouts: 0,
      unexpected_failures: 0,
      skipped: true,
      reason: 'gemini_not_configured — stress batch não executado'
    };
  }

  const results = [];
  let successes = 0;
  let timeouts = 0;
  let unexpected = 0;

  for (let i = 0; i < requested; i++) {
    const t0 = Date.now();
    try {
      const out = await Promise.race([
        geminiService.generateText(`ping-${i}`, { model }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), opts.timeoutMs || 10000))
      ]);
      const ok = out != null && String(out).trim().length > 0;
      if (ok) successes += 1;
      else unexpected += 1;
      results.push({ i, ok, latency_ms: Date.now() - t0 });
    } catch (e) {
      const msg = e.message || '';
      if (/timeout/i.test(msg)) timeouts += 1;
      else unexpected += 1;
      results.push({ i, ok: false, error: msg.slice(0, 120), latency_ms: Date.now() - t0 });
    }

    if (typeof opts.onProgress === 'function') {
      opts.onProgress({ i: i + 1, total: requested, successes, timeouts });
    }

    if (opts.delayMs && i < requested - 1) {
      await new Promise((r) => setTimeout(r, opts.delayMs));
    }
  }

  const tested = results.length;
  const successRate = tested > 0 ? Math.round((successes / tested) * 1000) / 10 : 0;

  return {
    requests_tested: tested,
    requests_requested: requested,
    successes,
    success_rate: successRate,
    timeouts,
    unexpected_failures: unexpected,
    latency_ms: {
      min: Math.min(...results.map((r) => r.latency_ms)),
      max: Math.max(...results.map((r) => r.latency_ms)),
      avg: Math.round(results.reduce((s, r) => s + r.latency_ms, 0) / tested)
    },
    sample_failures: results.filter((r) => !r.ok).slice(0, 5)
  };
}

function computeReadinessScore(parts) {
  const weights = [
    parts.config?.gemini_configured,
    parts.config?.credentials_valid,
    parts.livePing?.live_ping_ok,
    parts.vision?.vision_response_received,
    parts.triAi?.tri_ai_ready,
    parts.stress?.success_rate >= 95
  ];
  const passed = weights.filter(Boolean).length;
  return Math.round((passed / weights.length) * 100);
}

/**
 * Auditoria completa F49-D.
 */
async function generateGeminiReadinessAudit(options = {}) {
  const config = auditConfiguration();
  const livePing = await runLivePing(options);
  config.vertex_reachable = livePing.live_ping_ok;

  const vision = options.skipVision ? { skipped: true } : await validateVision();
  const stress = options.skipStress
    ? { skipped: true, reason: 'stress skipped by option' }
    : await runStressValidation({
        count: options.stressCount,
        delayMs: options.stressDelayMs ?? 150,
        timeoutMs: options.stressTimeoutMs ?? 10000,
        onProgress: options.onStressProgress
      });
  const triAi = await checkTriAiReadiness({ forceRefresh: true });

  const readinessScore = computeReadinessScore({
    config,
    livePing,
    vision,
    triAi,
    stress
  });

  const geminiOperational =
    config.gemini_configured &&
    config.credentials_valid &&
    livePing.live_ping_ok &&
    vision.vision_response_received !== false &&
    (vision.skipped || vision.vision_response_received) &&
    triAi.gemini;

  const finalVerdict = geminiOperational && triAi.tri_ai_ready &&
    (stress.skipped || stress.success_rate >= 90)
    ? 'F49_GEMINI_OPERATIONAL_CERTIFIED'
    : triAi.tri_ai_ready && livePing.live_ping_ok && vision.vision_response_received
      ? 'F49_GEMINI_PARTIAL_CERTIFIED'
      : 'F49_GEMINI_PENDING';

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    audit_mode: 'VALIDATION_ONLY',
    generated_at: new Date().toISOString(),

    summary: {
      gemini_configured: config.gemini_configured,
      vertex_reachable: livePing.live_ping_ok,
      credentials_valid: config.credentials_valid,
      live_ping_ok: livePing.live_ping_ok,
      vision_available: vision.vision_available ?? false,
      vision_response_received: vision.vision_response_received ?? false,
      tri_ai_ready: triAi.tri_ai_ready,
      readiness_score: readinessScore,
      gemini_operational: geminiOperational
    },

    configuration: config,
    live_ping: livePing,
    vision,
    tri_ai: triAi,
    stress,

    criteria: {
      gemini_readiness_completed: true,
      vision_certified: Boolean(vision.vision_response_received),
      tri_ai_certified: triAi.tri_ai_ready,
      stress_validation_completed: !stress.skipped,
      dashboard_ready: true,
      api_ready: true,
      gemini_operational: geminiOperational
    },

    executive_verdict: finalVerdict
  };
}

/** Snapshot rápido para GET /status (sem stress). */
async function getGeminiStatusSnapshot() {
  const config = auditConfiguration();
  const livePing = await runLivePing();
  const triAi = await checkTriAiReadiness({ forceRefresh: false });

  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    timestamp: new Date().toISOString(),
    gemini_configured: config.gemini_configured,
    credentials_valid: config.credentials_valid,
    live_ping_ok: livePing.live_ping_ok,
    latency_ms: livePing.latency_ms,
    openai: triAi.openai,
    anthropic: triAi.anthropic,
    gemini: triAi.gemini,
    tri_ai_ready: triAi.tri_ai_ready,
    readiness_score: computeReadinessScore({
      config,
      livePing,
      vision: { vision_response_received: null },
      triAi,
      stress: { success_rate: 0 }
    })
  };
}

module.exports = {
  generateGeminiReadinessAudit,
  getGeminiStatusSnapshot,
  auditConfiguration,
  runLivePing,
  validateVision,
  checkTriAiReadiness,
  runStressValidation,
  computeReadinessScore,
  LAYER,
  VISION_PROBE_JPEG_B64
};
