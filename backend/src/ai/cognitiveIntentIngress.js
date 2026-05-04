'use strict';

/**
 * Única porta de entrada de classificação de intenção do Conselho Cognitivo — Gemini.
 * Heurística local (classifyIntent) só pode ser *hint* no prompt, nunca decisão final em modo estrito.
 */

const geminiService = require('../services/geminiService');
const { INTENT } = require('./aiRoles');
const {
  isStrictAiPipeline,
  strictPipelineError,
  traceStage
} = require('./vertexCentralOrchestrator');

const ALLOWED = new Set(Object.values(INTENT));

function _normalizeIntent(raw) {
  const s = String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/-/g, '_');
  if (ALLOWED.has(s)) return s;
  return null;
}

/**
 * @param {string} sanitized
 * @param {{ data?: object }} dossier
 * @param {string} heuristicHint — apenas sugestão para o prompt (não é decisão em modo estrito)
 * @param {{ trace?: object|null }} [opts]
 * @returns {Promise<string>}
 */
async function refineCouncilIntentWithGemini(sanitized, dossier, heuristicHint, opts = {}) {
  const strict = isStrictAiPipeline();
  const trace = opts.trace || null;
  if (
    !strict &&
    String(process.env.COGNITIVE_GEMINI_INTENT_REFINEMENT || 'true').toLowerCase() === 'false'
  ) {
    return _normalizeIntent(heuristicHint) || INTENT.GENERICO_ASSISTIDO;
  }
  const hasImages = Array.isArray(dossier?.data?.images) && dossier.data.images.length > 0;
  const hint = JSON.stringify({
    heuristic_hint_only: String(heuristicHint || ''),
    kpis_n: Array.isArray(dossier?.data?.kpis) ? dossier.data.kpis.length : 0,
    events_n: Array.isArray(dossier?.data?.events) ? dossier.data.events.length : 0,
    has_images: hasImages
  });

  const geminiOk = typeof geminiService.isAvailable === 'function' && geminiService.isAvailable();
  if (!geminiOk) {
    if (strict) {
      throw strictPipelineError('STRICT_GEMINI_GATE_UNAVAILABLE', 'Gemini obrigatório na entrada: credenciais ou projeto Vertex/Google AI em falta.');
    }
    return _normalizeIntent(heuristicHint) || INTENT.GENERICO_ASSISTIDO;
  }

  const prompt = `És o ÚNICO classificador de intenção na entrada do sistema industrial IMPETUS.
A heurística local sugeriu (NÃO é decisão, só contexto): "${String(heuristicHint || '').slice(0, 200)}".

Escolhe UMA intenção canónica com base na mensagem do utilizador e no contexto.

Intenções permitidas (exactamente uma destas strings):
- ${INTENT.DIAGNOSTICO_OPERACIONAL}
- ${INTENT.ANALISE_MULTIMODAL}
- ${INTENT.CONSULTA_DADOS}
- ${INTENT.GENERICO_ASSISTIDO}

Mensagem do utilizador:
"""
${String(sanitized || '').slice(0, 6000)}
"""
Resumo estrutural: ${hint}

Responde APENAS JSON válido:
{"intent":"...","confidence":0.0}`;

  let raw;
  try {
    raw = await geminiService.generateText(prompt, {});
  } catch (e) {
    if (strict) {
      throw strictPipelineError('STRICT_GEMINI_INTENT_CALL_FAILED', e && e.message ? String(e.message) : 'gemini_intent_failed');
    }
    return _normalizeIntent(heuristicHint) || INTENT.GENERICO_ASSISTIDO;
  }

  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    if (strict) {
      throw strictPipelineError('STRICT_GEMINI_INTENT_EMPTY', 'Gemini não devolveu classificação de intenção.');
    }
    return _normalizeIntent(heuristicHint) || INTENT.GENERICO_ASSISTIDO;
  }

  let parsed = null;
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
  } catch (_e) {
    parsed = null;
  }

  if (!parsed || typeof parsed !== 'object') {
    if (strict) {
      throw strictPipelineError('STRICT_GEMINI_INTENT_INVALID_JSON', 'Gemini devolveu JSON de intenção inválido.');
    }
    return _normalizeIntent(heuristicHint) || INTENT.GENERICO_ASSISTIDO;
  }

  let intent = _normalizeIntent(parsed.intent);
  const c = Number(parsed.confidence);
  const confOk = Number.isFinite(c) ? c >= 0.35 : true;

  if (!intent || !confOk) {
    if (strict) {
      throw strictPipelineError(
        'STRICT_GEMINI_INTENT_REJECTED',
        'Gemini devolveu intenção fora do contrato ou confiança insuficiente.'
      );
    }
    intent = _normalizeIntent(heuristicHint) || INTENT.GENERICO_ASSISTIDO;
  }

  if (hasImages && intent !== INTENT.ANALISE_MULTIMODAL) {
    intent = INTENT.ANALISE_MULTIMODAL;
  }

  if (trace) {
    traceStage(trace, 'gemini_classificacao_intencao', { intent, confidence: parsed.confidence });
  }

  return intent;
}

module.exports = {
  refineCouncilIntentWithGemini
};
