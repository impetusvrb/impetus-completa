'use strict';

/**
 * Human-in-the-loop invisível: fecho de ciclo pela próxima interação (texto, voz, descrição de gesto).
 * Supervisão semântica: Gemini (Vertex/API). Sem botões Sim/Não.
 */
const geminiService = require('./geminiService');
const aiAnalytics = require('./aiAnalyticsService');
const operationalInsights = require('./operationalInsightsService');
const adaptiveGovernanceEngine = require('./adaptiveGovernanceEngine');
const aiLearningFeedbackService = require('./aiLearningFeedbackService');

const INTENT_THRESHOLD = 52;

function heuristicClassify(utterance, gestureDescription) {
  const u = String(utterance || '').trim();
  const g = String(gestureDescription || '').trim().toLowerCase();
  const text = `${u} ${g}`.toLowerCase();
  if (!text.trim()) return { intent: 'NONE', confidence: 0, evidence_quote: '', reason_pt: 'Vazio.' };

  if (
    /^(ok|certo|sim\b|de acordo|pode seguir|podes seguir|aprovo|concordo|vá em frente|va em frente|execute|executa|faça|faca|façam|siga|avança|avança\b|confirmo)/i.test(
      u.slice(0, 80)
    ) ||
    /(aceno|polegar|aprovação|confirm)/i.test(g)
  ) {
    return { intent: 'ACCEPTED', confidence: 58, evidence_quote: u.slice(0, 200) || g.slice(0, 200), reason_pt: 'Heurística de concordância.' };
  }
  if (/\b(não|nao|discordo|recuso|cancela|pare|não faça|nao faca|rejeito)\b/i.test(text)) {
    return { intent: 'REJECTED', confidence: 58, evidence_quote: u.slice(0, 200) || g.slice(0, 200), reason_pt: 'Heurística de discordância.' };
  }
  if (/\b(mas |porém|porem|exceto|desde que|somente se|ajusta|altera|em vez)\b/i.test(text)) {
    return { intent: 'ADJUSTED', confidence: 52, evidence_quote: u.slice(0, 200), reason_pt: 'Heurística de ressalva.' };
  }
  return { intent: 'NONE', confidence: 35, evidence_quote: u.slice(0, 120), reason_pt: 'Sem padrão claro (heurística).' };
}

function assistantSnippetFromTrace(row) {
  let out = row?.output_response;
  if (typeof out === 'string') {
    try {
      out = JSON.parse(out);
    } catch (err) {
      console.warn('[humanValidationClosureService][assistant_snippet_parse]', err?.message ?? err);
      return '';
    }
  }
  if (!out || typeof out !== 'object') return '';
  const s =
    (typeof out.content === 'string' && out.content) ||
    (typeof out.reply === 'string' && out.reply) ||
    (typeof out.answer === 'string' && out.answer) ||
    '';
  return String(s).slice(0, 2000);
}

/**
 * @param {object} params
 * @param {object} params.user - req.user (id, company_id)
 * @param {string} params.utterance - transcrição ou mensagem
 * @param {'TEXT'|'VOICE'|'VIDEO'} params.modality
 * @param {string} [params.gestureDescription]
 * @returns {Promise<{ closed: boolean, trace_id?: string, status?: string, detail?: object }>}
 */
async function tryClosePendingValidation(params) {
  const user = params.user;
  const utterance = String(params.utterance || '').trim();
  const modality = params.modality === 'VOICE' || params.modality === 'VIDEO' ? params.modality : 'TEXT';
  const gestureDescription = params.gestureDescription != null ? String(params.gestureDescription).trim() : '';

  if (!user?.company_id || !user?.id) return { closed: false };
  if (!utterance && !gestureDescription) return { closed: false };

  const pending = await aiAnalytics.getLatestPendingTraceForUser(user.company_id, user.id);
  if (!pending) return { closed: false };

  const assistantSummary = assistantSnippetFromTrace(pending);
  if (!assistantSummary) return { closed: false };

  let classification = null;
  if (geminiService.isAvailable()) {
    classification = await geminiService.classifyHumanLoopReaction({
      assistantSummary,
      userUtterance: utterance,
      gestureDescription: gestureDescription || undefined
    });
  }
  if (!classification) {
    classification = heuristicClassify(utterance, gestureDescription);
  }

  if (classification.intent === 'NONE' || classification.confidence < INTENT_THRESHOLD) {
    return { closed: false, detail: { evaluated: true, intent: classification.intent, confidence: classification.confidence } };
  }

  const status = classification.intent;
  const evidenceParts = [];
  if (utterance) evidenceParts.push(`[${modality}] ${utterance}`);
  if (gestureDescription) evidenceParts.push(`[Gesto/expressão] ${gestureDescription}`);
  const evidence = evidenceParts.join('\n---\n').slice(0, 12000);

  const auditEntry = {
    type: 'human_validation_closed',
    at: new Date().toISOString(),
    status,
    modality,
    evidence_quote: classification.evidence_quote,
    reason_pt: classification.reason_pt,
    classifier: geminiService.isAvailable() ? 'gemini_supervisor' : 'heuristic',
    confidence: classification.confidence,
    assistant_preview: assistantSummary.slice(0, 400)
  };

  const updated = await aiAnalytics.updateTraceHumanValidation({
    traceId: pending.trace_id,
    companyId: user.company_id,
    userId: user.id,
    status,
    modality,
    evidence,
    auditEntry
  });

  if (!updated) return { closed: false, detail: { race: true } };

  try {
    let modelInfo = pending.model_info;
    if (typeof modelInfo === 'string') {
      try {
        modelInfo = JSON.parse(modelInfo);
      } catch (err) {
        console.warn('[humanValidationClosureService][model_info_parse]', err?.message ?? err);
        modelInfo = {};
      }
    }
    if (!modelInfo || typeof modelInfo !== 'object') modelInfo = {};
    const operationType =
      modelInfo.operation_type != null && modelInfo.operation_type !== ''
        ? String(modelInfo.operation_type).slice(0, 96)
        : null;
    aiLearningFeedbackService.captureFeedback(pending.trace_id, status, {
      user_id: user.id,
      company_id: user.company_id,
      module_name: pending.module_name || null,
      operation_type: operationType
    });
  } catch (err) {
    console.warn('[humanValidationClosureService][capture_feedback]', err?.message ?? err);
  }

  try {
    adaptiveGovernanceEngine.invalidateAfterFeedback(user.company_id, user.id);
  } catch (err) {
    console.warn('[humanValidationClosureService][invalidate_governance]', err?.message ?? err);
  }

  const out =
    pending.output_response && typeof pending.output_response === 'object'
      ? pending.output_response
      : typeof pending.output_response === 'string'
        ? (() => {
            try {
              return JSON.parse(pending.output_response);
            } catch (err) {
              console.warn('[humanValidationClosureService][pending_output_parse]', err?.message ?? err);
              return {};
            }
          })()
        : {};
  const relatedInsight = out.related_operational_insight_id;
  if (
    relatedInsight != null &&
    relatedInsight !== '' &&
    (status === 'ACCEPTED' || status === 'ADJUSTED' || status === 'REJECTED')
  ) {
    operationalInsights
      .markHumanOrganicValidation({
        insightId: relatedInsight,
        companyId: user.company_id,
        userId: user.id,
        status,
        modality,
        evidence,
        traceId: pending.trace_id
      })
      .catch((e) => console.warn('[HITL_INSIGHT]', e?.message));
  }

  return { closed: true, trace_id: pending.trace_id, status, detail: classification };
}

module.exports = {
  tryClosePendingValidation,
  heuristicClassify,
  assistantSnippetFromTrace,
  INTENT_THRESHOLD
};
