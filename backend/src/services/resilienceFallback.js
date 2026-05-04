'use strict';

/**
 * Fallback em camadas:
 * L1 — retry mesmo modelo (backoff curto)
 * L2 — modelo alternativo (Claude / GPT)
 * L3 — resposta mínima segura (pipeline simplificado, JSON único)
 */

const ai = require('./ai');
const circuitBreakerService = require('./circuitBreakerService');
const { resilienceLog } = require('./resilienceStructuredLog');

function fallbackModelName() {
  return (
    process.env.IMPETUS_RESILIENCE_FALLBACK_MODEL ||
    process.env.COGNITIVE_GPT_FINAL_MODEL ||
    'gpt-4o-mini'
  );
}

function _sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function _metrics() {
  try {
    return require('./resilienceMetricsService');
  } catch (_e) {
    return { recordFallbackUsage: () => {} };
  }
}

function isUpstreamFallbackEnabled() {
  return String(process.env.IMPETUS_RESILIENCE_UPSTREAM_FALLBACK || 'true').toLowerCase() === 'true';
}

function isFallbackEnabled() {
  return String(process.env.IMPETUS_RESILIENCE_MODEL_FALLBACK || '').trim().toLowerCase() === 'true';
}

function isPipelineFallbackEnabled() {
  return String(process.env.IMPETUS_RESILIENCE_SOFT_PIPELINE_FALLBACK || '').toLowerCase() === 'true';
}

function _systemIsDegraded() {
  try {
    return require('./systemRuntimeState').system_state.status === 'DEGRADED';
  } catch (_e) {
    return false;
  }
}

function _cbSkipTryL2Enabled() {
  return String(process.env.IMPETUS_RESILIENCE_CB_SKIP_TRY_L2 || 'true').toLowerCase() !== 'false';
}

/**
 * Claude: L1 retry mesmo modelo → L2 modelo env alternativo.
 */
async function claudeAnalyzeTiered(systemPrompt, userContent, opts = {}) {
  const claudeService = require('./claudeService');
  if (!isUpstreamFallbackEnabled()) {
    return claudeService.analyze(systemPrompt, userContent, opts);
  }

  if (circuitBreakerService.shouldSkip('claude')) {
    _metrics().recordFallbackUsage('claude_cb_skip_chain');
    return null;
  }

  let r = await claudeService.analyze(systemPrompt, userContent, opts);
  if (r) return r;

  _metrics().recordFallbackUsage('claude_L1_retry_same');
  await _sleep(parseInt(process.env.IMPETUS_RESILIENCE_RETRY_BACKOFF_MS || '120', 10) || 120);
  const t1 = Math.max(14000, Math.floor((opts.timeout || 45000) * 0.88));
  r = await claudeService.analyze(systemPrompt, userContent, { ...opts, timeout: t1 });
  if (r) return r;

  const alt =
    process.env.IMPETUS_RESILIENCE_CLAUDE_FALLBACK_MODEL ||
    process.env.COGNITIVE_CLAUDE_PLAN_MODEL ||
    '';
  const primaryModel = opts.model || process.env.ANTHROPIC_MODEL || '';
  if (alt && String(alt).trim() !== String(primaryModel).trim()) {
    _metrics().recordFallbackUsage('claude_L2_alt_model');
    r = await claudeService.analyze(systemPrompt, userContent, { ...opts, model: alt.trim(), timeout: t1 });
    if (r) return r;
  }

  return null;
}

/**
 * GPT final: L1 → retry mesmo modelo | L2 modelo fallback | L3 JSON mínimo sem schema estrito.
 */
async function chatCompletionMessagesTiered(messages, opts = {}, dossierLite = {}) {
  const primary = opts.model || process.env.COGNITIVE_GPT_FINAL_MODEL || 'gpt-4o-mini';
  const fallbackModel =
    process.env.IMPETUS_RESILIENCE_FALLBACK_MODEL ||
    process.env.COGNITIVE_GPT_FINAL_FALLBACK_MODEL ||
    'gpt-4o-mini';

  if (circuitBreakerService.shouldSkip('gpt')) {
    _metrics().recordFallbackUsage('gpt_cb_skip_chain');
    const degraded = _systemIsDegraded();
    const bad = (x) =>
      !x || String(x).startsWith('FALLBACK:') || String(x).trim().length < 6;

    if (!degraded && _cbSkipTryL2Enabled() && fallbackModel !== primary) {
      _metrics().recordFallbackUsage('gpt_cb_skip_try_L2');
      resilienceLog('gpt_cb_skip_try_L2', {
        provider: 'gpt',
        tier: 'gpt_tiered',
        fallback_level: 'L2',
        system_status: degraded ? 'DEGRADED' : 'non_degraded'
      });
      const tProbe = Math.min(26000, Math.max(12000, Math.floor((opts.timeout || 45000) * 0.85)));
      const probeText = await ai.chatCompletionMessages(messages, {
        ...opts,
        model: fallbackModel,
        timeout: tProbe,
        resilienceCircuitBypass: true
      });
      if (!bad(probeText)) return probeText;
    }

    _metrics().recordFallbackUsage('gpt_cb_skip_to_L3');
    resilienceLog('gpt_cb_skip_to_L3', {
      provider: 'gpt',
      tier: 'gpt_tiered',
      fallback_level: 'L3',
      system_status: degraded ? 'DEGRADED' : 'non_degraded'
    });
    return buildMinimalSafeFinalJson(messages, opts, dossierLite);
  }

  const run = async (model, timeoutMs, tag) => {
    return ai.chatCompletionMessages(messages, {
      ...opts,
      model,
      timeout: timeoutMs
    });
  };

  let text = await run(primary, opts.timeout || 45000, 'primary');
  const bad = (x) =>
    !x || String(x).startsWith('FALLBACK:') || String(x).trim().length < 6;

  if (!bad(text)) return text;

  _metrics().recordFallbackUsage('gpt_L1_retry_same');
  await _sleep(parseInt(process.env.IMPETUS_RESILIENCE_RETRY_BACKOFF_MS || '120', 10) || 120);
  const tRetry = Math.max(12000, Math.floor((opts.timeout || 45000) * 0.85));
  text = await run(primary, tRetry, 'retry');
  if (!bad(text)) return text;

  if (fallbackModel !== primary) {
    _metrics().recordFallbackUsage('gpt_L2_alt_model');
    text = await run(fallbackModel, Math.min(tRetry, 26000), 'fallback');
    if (!bad(text)) return text;
  }

  _metrics().recordFallbackUsage('gpt_L3_minimal_pipeline');
  return buildMinimalSafeFinalJson(messages, opts, dossierLite);
}

async function chatCompletionMessagesWithOptionalModelFallback(messages, opts = {}, dossierLite = {}) {
  const fullTier = String(process.env.IMPETUS_RESILIENCE_GPT_FULL_TIERS || 'true').toLowerCase() === 'true';
  if (fullTier || isFallbackEnabled()) {
    return chatCompletionMessagesTiered(messages, opts, dossierLite);
  }
  return ai.chatCompletionMessages(messages, opts);
}

/**
 * L3 — uma chamada curta sem response_format forçado (maior chance de sucesso).
 */
async function buildMinimalSafeFinalJson(messages, opts, dossierLite) {
  const sys =
    (messages.find((m) => m.role === 'system') || {}).content ||
    'Motor IMPETUS em modo contingência.';
  const usr =
    (messages.find((m) => m.role === 'user') || {}).content ||
    String(dossierLite.requestText || '').slice(0, 6000);

  const minimalUser = `Modo contingência IMPETUS: responda APENAS um JSON válido com chaves content (string PT curta, operacional) e explanation_layer (objeto com facts_used[], business_rules[], confidence_score number, limitations[], reasoning_trace string curta, data_lineage[]).\nContexto resumido:\n${String(usr).slice(0, 14000)}`;

  const out = await ai.chatCompletionMessages(
    [
      { role: 'system', content: String(sys).slice(0, 8000) },
      { role: 'user', content: minimalUser }
    ],
    {
      billing: opts.billing,
      max_tokens: Math.min(900, opts.max_tokens || 900),
      timeout: Math.min(22000, opts.timeout || 22000),
      model: process.env.IMPETUS_RESILIENCE_MINIMAL_MODEL || fallbackModelName()
    }
  );
  if (out && !String(out).startsWith('FALLBACK:')) return out;

  const esc = JSON.stringify({
    content:
      'Resposta em modo contingência: o motor completo não concluiu; verifique dados em breve ou reformule o pedido.',
    explanation_layer: {
      facts_used: [],
      business_rules: ['Resposta mínima IMPETUS (fallback L3)'],
      confidence_score: 28,
      limitations: ['Pipeline completo indisponível ou tempo esgotado; saída simplificada.'],
      reasoning_trace: 'Fallback L3 sem chamada externa bem-sucedida.',
      data_lineage: []
    }
  });
  return esc;
}

function _parseJsonLenient(s) {
  if (s == null) return null;
  try {
    return JSON.parse(String(s));
  } catch {
    const m = String(s).match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

/**
 * Contrato fixo soft fallback — sempre JSON válido com campos obrigatórios + compatibilidade synthesizer (content / explanation_layer).
 */
function buildSoftFallbackEnvelope(parsed, requestText) {
  const base = parsed && typeof parsed === 'object' ? parsed : {};
  const fromMsg =
    typeof base.message === 'string' && base.message.trim()
      ? base.message.trim()
      : '';
  const fromContent =
    typeof base.content === 'string' && base.content.trim() ? base.content.trim() : '';
  const msg =
    fromMsg ||
    fromContent ||
    'Operação em modo degradado: o pipeline cognitivo completo não foi concluído. Reformule ou tente mais tarde.';

  let conf = typeof base.confidence === 'number' && !Number.isNaN(base.confidence) ? base.confidence : NaN;
  if (Number.isNaN(conf) && base.explanation_layer && typeof base.explanation_layer.confidence_score === 'number') {
    conf = base.explanation_layer.confidence_score;
  }
  if (Number.isNaN(conf)) conf = 40;
  conf = Math.max(0, Math.min(100, Math.round(conf)));

  const explIn = base.explanation_layer && typeof base.explanation_layer === 'object' ? base.explanation_layer : null;
  const explanation_layer = explIn
    ? {
        ...explIn,
        confidence_score:
          typeof explIn.confidence_score === 'number' && !Number.isNaN(explIn.confidence_score)
            ? Math.max(0, Math.min(100, Math.round(explIn.confidence_score)))
            : conf
      }
    : {
        facts_used: [],
        business_rules: ['soft_pipeline_fallback_contract'],
        confidence_score: conf,
        limitations: [
          `Contingência IMPETUS — pedido resumido: ${String(requestText || '').slice(0, 160)}`
        ],
        reasoning_trace: 'soft_fallback_contract',
        data_lineage: []
      };

  return {
    status: 'degraded',
    message: String(msg).slice(0, 12000),
    confidence: conf,
    fallback: true,
    content: String(msg).slice(0, 12000),
    explanation_layer
  };
}

function serializeSoftFallbackContract(parsed, requestText, sourceTag) {
  const env = buildSoftFallbackEnvelope(parsed, requestText);
  resilienceLog('soft_fallback_contract_ok', {
    provider: 'gpt',
    tier: 'soft_pipeline',
    fallback_level: sourceTag || 'unknown',
    detail: `confidence=${env.confidence}`
  });
  return JSON.stringify(env);
}

/**
 * Execução única GPT quando o pipeline completo falhou (não-STRICT apenas).
 */
async function generateSoftPipelineAnswer({ requestText, userScope, billing }) {
  const rt = String(requestText || '').slice(0, 8000);
  const prompt = `És o assistente operacional IMPETUS. Responde em português com UM único objeto JSON válido.
Campos obrigatórios no JSON:
- "message": string (mensagem útil e curta ao utilizador)
- "confidence": número entre 0 e 100
- "content": igual à message (compatibilidade)
- "explanation_layer": objeto com facts_used[], business_rules[], confidence_score, limitations[], reasoning_trace, data_lineage[]
Inclui também "status":"degraded", "fallback":true no mesmo objeto.

Pedido do utilizador: ${rt}`;

  _metrics().recordFallbackUsage('pipeline_L3_soft_single_pass');

  if (circuitBreakerService.shouldSkip('gpt')) {
    const degraded = _systemIsDegraded();
    const primaryModel = process.env.COGNITIVE_GPT_FINAL_MODEL || 'gpt-4o-mini';
    const fbModel = fallbackModelName();

    if (!degraded && _cbSkipTryL2Enabled() && String(fbModel).trim() !== String(primaryModel).trim()) {
      _metrics().recordFallbackUsage('pipeline_soft_cb_skip_try_L2');
      resilienceLog('pipeline_soft_cb_skip_try_L2', {
        provider: 'gpt',
        tier: 'soft_pipeline',
        fallback_level: 'L2',
        system_status: degraded ? 'DEGRADED' : 'non_degraded'
      });
      const rawProbe = await ai.chatCompletion(prompt, {
        max_tokens: 900,
        timeout: 22000,
        billing,
        model: fbModel,
        resilienceCircuitBypass: true
      });
      if (rawProbe && !String(rawProbe).startsWith('FALLBACK:')) {
        const parsedProbe = _parseJsonLenient(rawProbe);
        if (parsedProbe && typeof parsedProbe === 'object') {
          return serializeSoftFallbackContract(parsedProbe, rt, 'model_ok_cb_bypass');
        }
      }
    }

    resilienceLog('pipeline_soft_cb_skip_static', {
      provider: 'gpt',
      tier: 'soft_pipeline',
      fallback_level: 'L3_static',
      system_status: degraded ? 'DEGRADED' : 'non_degraded'
    });
    return serializeSoftFallbackContract(
      {
        message:
          'Serviço de IA em recuperação (circuito). Resposta mínima local — simplifique o pedido ou tente em instantes.',
        confidence: 28
      },
      rt,
      'gpt_circuit_open'
    );
  }

  const raw = await ai.chatCompletion(prompt, {
    max_tokens: 900,
    timeout: 22000,
    billing
  });

  if (!raw || !String(raw).trim()) {
    return serializeSoftFallbackContract({}, rt, 'empty_raw');
  }

  if (raw && String(raw).startsWith('FALLBACK:')) {
    return serializeSoftFallbackContract(
      {
        message: 'Serviço de IA temporariamente indisponível; resposta de contingência IMPETUS.',
        confidence: 24,
        explanation_layer: {
          facts_used: [],
          business_rules: ['fallback_wallet_or_ia'],
          confidence_score: 24,
          limitations: [String(raw).slice(0, 220)],
          reasoning_trace: 'fallback_string',
          data_lineage: []
        }
      },
      rt,
      'gpt_fallback_string'
    );
  }

  let parsed = _parseJsonLenient(raw);
  if (!parsed || typeof parsed !== 'object') {
    return serializeSoftFallbackContract({}, rt, 'parse_repair');
  }

  return serializeSoftFallbackContract(parsed, rt, 'model_ok');
}

module.exports = {
  isFallbackEnabled,
  isUpstreamFallbackEnabled,
  isPipelineFallbackEnabled,
  claudeAnalyzeTiered,
  chatCompletionMessagesTiered,
  chatCompletionMessagesWithOptionalModelFallback,
  buildMinimalSafeFinalJson,
  generateSoftPipelineAnswer,
  buildSoftFallbackEnvelope,
  serializeSoftFallbackContract
};
