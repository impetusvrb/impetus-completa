'use strict';

/**
 * M1.19 — Truth-protected cognitive pipeline (GLOBAL-02)
 * promptFirewall → secureContextBuilder → LLM → industrial_truth → audit
 */

const promptFirewall = require('../middleware/promptFirewall');
const secureContextBuilder = require('./secureContextBuilder');
const aiSecurityGateway = require('./aiSecurityGateway');
const truthClosure = require('./cognitiveTruthClosureService');
const { buildTruthSafePermissionDenial } = require('../middleware/authorize');

const PROTECTED_CHANNELS = Object.freeze([
  'voice_assistant',
  'executive_ceo_chat',
  'executive_ceo_whatsapp',
]);

function listProtectedChannels() {
  return [...PROTECTED_CHANNELS];
}

function isChannelProtected(channel) {
  return PROTECTED_CHANNELS.includes(String(channel || '').trim());
}

/**
 * @returns {Promise<{ ok: boolean, blocked?: boolean, reply?: string, text?: string, meta?: object }>}
 */
async function runTruthProtectedTurn({
  user,
  queryText,
  channel,
  invokeLlm,
  injectOperational = true,
  maxTokens = 600,
}) {
  const ch = String(channel || 'unknown').slice(0, 64);
  const query = String(queryText || '').trim();

  const ingress = await promptFirewall.analyzePrompt(query, user);
  if (ingress.blocked) {
    const denial = buildTruthSafePermissionDenial(
      ingress.reason === 'PROMPT_SECURITY' ? 'PROMPT_SECURITY' : 'VIEW_STRATEGIC'
    );
    return {
      ok: false,
      blocked: true,
      reply: ingress.reply || denial.reply,
      meta: { channel: ch, industrial_truth: denial.industrial_truth, layer: 'prompt_firewall' },
    };
  }

  let secureCtx = null;
  try {
    secureCtx = await secureContextBuilder.buildContext(user, {
      companyId: user?.company_id,
      queryText: query,
      channel: ch,
      forDiagnostic: false,
    });
  } catch (err) {
    console.warn('[TRUTH_PROTECTED_PIPELINE][secureContext]', err?.message ?? err);
  }

  let text = '';
  if (typeof invokeLlm === 'function') {
    text = await invokeLlm({ user, query, secureCtx, maxTokens, channel: ch });
  } else if (aiSecurityGateway.isGatewayEnabled()) {
    const gw = await aiSecurityGateway.applyGatewayPolicies({
      user,
      channel: ch,
      messages: [{ role: 'user', content: query }],
      metadata: { secure_context: secureCtx, channel: ch },
    });
    if (gw?.blocked) {
      const denial = buildTruthSafePermissionDenial('PROMPT_SECURITY');
      return { ok: false, blocked: true, reply: denial.reply, meta: { channel: ch, layer: 'ai_gateway' } };
    }
    const llm = await aiSecurityGateway.invokeUnifiedLlm({
      user,
      channel: ch,
      messages: gw.messages || [{ role: 'user', content: query }],
      metadata: { secure_context: secureCtx, ...(gw.metadata || {}) },
      maxTokens,
    });
    text = llm?.text || llm?.content || '';
  }

  text = String(text || '').trim();
  if (!text) {
    text = 'Não foi possível processar a consulta no momento.';
  }

  const finalized = await truthClosure.applyCognitiveTextTruth(text, {
    user,
    channel: ch,
    queryText: query,
    injectOperational,
  });

  return {
    ok: true,
    blocked: false,
    text: finalized.text,
    reply: finalized.text,
    meta: {
      channel: ch,
      truth: finalized.meta,
      secure_context_applied: !!secureCtx,
      protected_channel: true,
    },
  };
}

function getTruthCoverageReport() {
  const registry = require('./truthChannelRegistry');
  return registry.getCoverageReport();
}

module.exports = {
  PROTECTED_CHANNELS,
  listProtectedChannels,
  isChannelProtected,
  runTruthProtectedTurn,
  getTruthCoverageReport,
};
