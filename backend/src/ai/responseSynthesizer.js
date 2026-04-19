'use strict';

/**
 * Consolidador final — uma única face para o cliente (sem expor divergências brutas entre modelos).
 */

function extractJsonBlock(text) {
  if (!text || typeof text !== 'string') return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

/**
 * @param {object} params
 * @param {string} params.finalText - texto já adequado ao usuário (GPT interface)
 * @param {object} params.dossier
 * @param {object} params.validation - resultado da validação cruzada (opcional)
 * @param {string[]} params.modelsUsed
 * @param {boolean} params.degraded
 */
function synthesize({
  finalText,
  dossier,
  validation,
  modelsUsed,
  degraded,
  limitations = []
}) {
  const based_on = [];
  if (modelsUsed?.includes('google_gemini')) based_on.push('Percepção multimodal (Gemini)');
  if (modelsUsed?.includes('anthropic')) based_on.push('Análise técnica estruturada (Claude)');
  if (modelsUsed?.includes('openai')) based_on.push('Formulação operacional final (GPT)');

  const warnings = [];
  if (validation && validation.aligned === false) {
    warnings.push(
      'Validação cruzada identificou lacunas entre a recomendação e a análise técnica.'
    );
    if (Array.isArray(validation.gaps)) {
      validation.gaps.slice(0, 5).forEach((g) => warnings.push(`Gap: ${g}`));
    }
  }
  if (degraded) {
    warnings.push('Execução em modo degradado: um ou mais motores não estiveram disponíveis.');
  }

  let confidence = 0.75;
  if (dossier?.analysis?.technical_analysis) confidence += 0.08;
  if (dossier?.analysis?.perception) confidence += 0.07;
  if (validation?.aligned === true) confidence += 0.05;
  if (validation?.aligned === false) confidence -= 0.15;
  if (degraded) confidence -= 0.2;
  confidence = Math.max(0.15, Math.min(0.98, confidence));

  const explanationParts = [
    `Rastreio: trace_id=${dossier.trace_id}`,
    `Intenção classificada: ${dossier.context?.intent || 'n/d'}`,
    `Motores utilizados: ${(modelsUsed || []).join(', ') || 'nenhum'}`,
    `Risco heurístico considerado para governança: ${dossier.decision?.risk_level || 'n/d'}`
  ];
  if (limitations.length) explanationParts.push(`Limitações: ${limitations.join('; ')}`);

  const requires_action =
    (dossier.decision?.requires_human_validation !== false &&
      dossier.decision?.risk_level &&
      dossier.decision.risk_level !== 'low') ||
    (validation && validation.aligned === false);

  return {
    answer: String(finalText || '').trim(),
    explanation: explanationParts.join('\n'),
    confidence: Number(confidence.toFixed(4)),
    based_on,
    warnings,
    requires_action: !!requires_action,
    trace_id: dossier.trace_id
  };
}

module.exports = {
  synthesize,
  extractJsonBlock
};
