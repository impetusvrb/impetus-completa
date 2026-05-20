'use strict';

const phaseF = require('../config/phaseFFeatureFlags');
const { logPhaseF } = require('../observability/phaseFLogger');
const telemetry = require('../observability/governanceTelemetry');
const { stripInferenceFromText } = require('./secureKpiExposureResolver');
const contextExposureSanitizer = require('../../security/contextExposureSanitizer');

const STRATEGIC_PATTERNS = [
  /\bscope\s*[123]\b/gi,
  /\besg\s*score\b/gi,
  /\breceita\b/gi,
  /\bebitda\b/gi,
  /\bfolha\s+de\s+pagamento\b/gi,
  /\bclientes?\s+estrat[eé]gicos?\b/gi
];

/**
 * Sanitiza payload de entrada e texto de resumo para generators IA.
 */
function sanitizeSummaryContext(pack, user, exposure = {}) {
  if (!phaseF.isSummaryGovernanceEnabled(user)) {
    return { pack, sanitized: false };
  }

  if (exposure.allow_ai_insights === false || exposure.sections?.smart_summary === false) {
    logPhaseF('SUMMARY_CONTEXT_DENIED', {
      user_id: user?.id,
      reason: 'ai_insights_or_smart_summary_denied'
    });
    telemetry.recordDenial('summary');
    return {
      pack: {
        redacted: true,
        user_message: 'Resumo inteligente não disponível para o seu nível de acesso.',
        summary_allowed: false
      },
      sanitized: true,
      denied: true
    };
  }

  let sanitizedPack = pack;
  if (pack && typeof pack === 'object') {
    sanitizedPack = contextExposureSanitizer.sanitizeContextForAI(
      { ...pack },
      user,
      exposure.cognitive_envelope
    );
  }

  logPhaseF('SUMMARY_POLICY_APPLIED', { user_id: user?.id });
  telemetry.recordSanitization('summary');

  return { pack: sanitizedPack, sanitized: true, denied: false };
}

function sanitizeSummaryText(text, user, exposure = {}) {
  if (!text || typeof text !== 'string') return text;
  if (!phaseF.isSummaryGovernanceEnabled(user)) return text;

  let out = stripInferenceFromText(text, exposure);

  if (exposure.cognitive_envelope?.strategic_access === false) {
    for (const pat of STRATEGIC_PATTERNS) {
      if (pat.test(out)) {
        out = out.replace(pat, '[informação estratégica restrita]');
      }
    }
  }

  if (exposure.cognitive_envelope?.cross_domain_access === false) {
    out = out.replace(/\b(rh|recursos humanos|financeiro|folha)\b/gi, '[domínio restrito]');
  }

  logPhaseF('SUMMARY_SANITIZED', { user_id: user?.id, length: out.length });
  telemetry.recordSanitization('summary_text');
  return out;
}

module.exports = {
  sanitizeSummaryContext,
  sanitizeSummaryText
};
