'use strict';

const phaseW = require('./config/phaseWFeatureFlags');
const { logPhaseW } = require('./phaseWLogger');
const { extractReplyText } = require('./chatPayloadUtils');

const AMBIGUOUS = /\b(talvez|possivelmente|não tenho certeza|pode ser que|em tese|depende)\b/i;
const UNCERTAIN = /\b(não sei|incerto|difícil dizer|não está claro)\b/i;

function analyzeChatAmbiguity(user, chatPayload, ctx = {}) {
  const text = extractReplyText(chatPayload);
  const issues = [];
  if (AMBIGUOUS.test(text)) issues.push({ type: 'multiple_interpretations', severity: 'medium' });
  if (UNCERTAIN.test(text)) issues.push({ type: 'uncertainty', severity: 'medium' });
  if (text.length > 0 && text.length < 60) issues.push({ type: 'weak_contextual_grounding', severity: 'low' });
  if (ctx.conflicting_context) issues.push({ type: 'conflicting_context', severity: 'high' });

  const score = Number(Math.max(0.35, 1 - issues.length * 0.12).toFixed(4));

  if (issues.length && phaseW.isChatRuntimeObservabilityEnabled()) {
    logPhaseW('CHAT_AMBIGUITY_DETECTED', { count: issues.length, shadow_only: true });
  }

  return {
    ambiguity_detected: issues.length > 0,
    ambiguity_score: score,
    issues,
    auto_correct: false
  };
}

module.exports = { analyzeChatAmbiguity };
