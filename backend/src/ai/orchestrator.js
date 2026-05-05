'use strict';

const crypto = require('crypto');
const ai = require('../services/ai');
const aiAnalyticsService = require('../services/aiAnalyticsService');
const { buildSystemPrompt } = require('./core/systemPrompt');
const { buildPersonalityBlock } = require('./core/personality');
const { buildBehaviorRulesBlock } = require('./core/behaviorRules');
const { buildResponseStyleBlock } = require('./core/responseStyle');
const { buildContext } = require('./core/contextBuilder');

function detectIntent(input) {
  const text = String(input || '').toLowerCase();
  if (text.includes('erro') || text.includes('problema')) return 'diagnostic';
  if (text.includes('como fazer')) return 'instruction';
  if (text.includes('ideia')) return 'strategy';
  return 'general';
}

function composeSystem({ mode, context }) {
  const blocks = [
    buildSystemPrompt(),
    buildPersonalityBlock(),
    buildBehaviorRulesBlock(),
    buildResponseStyleBlock(mode),
    buildContext(context)
  ].filter(Boolean);

  return blocks.join('\n\n');
}

function parseEvaluation(raw) {
  try {
    const match = String(raw || '').match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch (_err) {
    return null;
  }
}

async function evaluateResponse({ input, response }) {
  const evalPrompt = [
    'Avalie a resposta da IA e retorne APENAS JSON válido.',
    'Critérios (0-10): clareza, utilidade, aderencia_formato, resolveu_problema.',
    'Retorne no formato:',
    '{"clareza":0,"utilidade":0,"aderencia_formato":0,"resolveu_problema":0,"quality_score":0,"correction_needed":false,"feedback":"texto curto"}',
    `Input do usuário: ${String(input || '').slice(0, 3000)}`,
    `Resposta da IA: ${String(response || '').slice(0, 6000)}`
  ].join('\n\n');

  const raw = await ai.chatCompletionMessages(
    [{ role: 'user', content: evalPrompt }],
    { max_tokens: 260, model: process.env.OPENAI_MODEL || 'gpt-4o-mini' }
  );
  const parsed = parseEvaluation(raw) || {};
  const qualityScoreRaw = Number(parsed.quality_score);
  const qualityScore = Number.isFinite(qualityScoreRaw)
    ? Math.max(0, Math.min(10, qualityScoreRaw))
    : null;
  const correctionNeeded = parsed.correction_needed === true;

  return {
    scores: {
      clareza: Number(parsed.clareza) || null,
      utilidade: Number(parsed.utilidade) || null,
      aderencia_formato: Number(parsed.aderencia_formato) || null,
      resolveu_problema: Number(parsed.resolveu_problema) || null
    },
    qualityScore,
    feedback: parsed.feedback ? String(parsed.feedback).slice(0, 400) : null,
    correctionNeeded
  };
}

async function runAI({ input, user, context = {}, mode = 'text', history = [], maxTokens = 700, model }) {
  const startedAt = Date.now();
  const intent = detectIntent(input);
  const normalizedContext = {
    ...context,
    intent,
    extraContext: [context.extraContext, `Intent detectada: ${intent}.`].filter(Boolean).join('\n')
  };

  const system = composeSystem({ mode, context: normalizedContext });
  const messages = [{ role: 'system', content: system }];

  for (const msg of history) {
    if (!msg || (msg.role !== 'user' && msg.role !== 'assistant')) continue;
    messages.push({ role: msg.role, content: String(msg.content || '') });
  }

  messages.push({ role: 'user', content: String(input || '').slice(0, 12000) });

  const billing =
    user && user.company_id && user.id
      ? { companyId: user.company_id, userId: user.id }
      : undefined;

  const response = await ai.chatCompletionMessages(messages, {
    model,
    max_tokens: maxTokens,
    billing
  });

  const responseText = String(response || '');
  const estimatedTokens = Math.max(1, Math.ceil((String(input || '').length + responseText.length) / 4));
  const responseTime = Date.now() - startedAt;
  let quality = null;
  try {
    quality = await evaluateResponse({ input, response: responseText });
  } catch (err) {
    console.warn('[AI_ORCHESTRATOR_EVAL]', err?.message || err);
  }
  const qualityScore = quality?.qualityScore;
  const failureFlag = qualityScore != null ? qualityScore < 6 : false;

  if (user && user.company_id) {
    aiAnalyticsService.enqueueAiTrace({
      trace_id: crypto.randomUUID(),
      user_id: user.id || null,
      company_id: user.company_id,
      module_name: `ai_orchestrator_${mode}`,
      mode,
      intent,
      input: String(input || '').slice(0, 12000),
      response: responseText,
      response_time: responseTime,
      tokens: estimatedTokens,
      quality_score: qualityScore,
      user_feedback: quality?.feedback || null,
      failure_flag: failureFlag,
      correction_needed: quality?.correctionNeeded === true,
      input_payload: {
        input: String(input || '').slice(0, 12000),
        mode,
        intent,
        context_keys: Object.keys(normalizedContext || {})
      },
      output_response: {
        response: responseText,
        response_time: responseTime,
        tokens: estimatedTokens,
        quality_score: qualityScore,
        user_feedback: quality?.feedback || null,
        failure_flag: failureFlag,
        correction_needed: quality?.correctionNeeded === true,
        evaluation_scores: quality?.scores || null
      },
      model_info: {
        model: model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
        estimated_tokens: estimatedTokens,
        intent,
        mode,
        quality_score: qualityScore
      }
    });
  }

  console.log('[AI_ORCHESTRATOR_RUN]', {
    mode,
    intent,
    input: String(input || '').slice(0, 280),
    tokens: estimatedTokens,
    responseTime,
    quality_score: qualityScore,
    failure_flag: failureFlag,
    correction_needed: quality?.correctionNeeded === true
  });

  return response;
}

module.exports = {
  runAI,
  detectIntent
};
