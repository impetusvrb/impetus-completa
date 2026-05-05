'use strict';

const geminiService = require('./geminiService');
const aiIncidentService = require('./aiIncidentService');

/** Padrões fortes (PT-BR) — evita chamada ao modelo quando a intenção é óbvia. */
const STRONG_COMPLAINT_PATTERNS = [
  /\b(isso|isto)\s+(está|ta)\s+errad/i,
  /\b(voce|você|tu)\b.{0,40}\b(invent|mentir|alucin|fantasi)/i,
  /\b(inventando|inventou)\s+dados/i,
  /\binformac(ao|ão)\s+n[aã]o\s+confere/i,
  /\bn[aã]o\s+confere/i,
  /\bestá\s+errado|esta\s+errado|tá\s+errado/i,
  /\bdado[s]?\s+(errad|incorret|fals)/i,
  /\balucina[cç][aã]o\b/i,
  /\bresposta\s+(errad|incorret|absurd)/i,
  /\b(isso|isto)\s+n[aã]o\s+bate\b/i,
  /\bcompletamente\s+errad/i,
  /\best[aá]s?\s+a\s+inventar/i,
  /\bresposta\s+est[aá]\s+errad/i
];

function heuristicComplaint(message) {
  const t = String(message || '').trim();
  if (t.length < 6) return { hit: false, incident_type: 'UNKNOWN' };
  for (const re of STRONG_COMPLAINT_PATTERNS) {
    if (re.test(t)) {
      const lower = t.toLowerCase();
      let incident_type = 'UNKNOWN';
      if (/\binvent|alucin|fantas|mentir\b/.test(lower)) incident_type = 'ALUCINACAO';
      else if (/\berrad|incorret|n[aã]o\s+confere|n[aã]o\s+bate|fals/.test(lower))
        incident_type = 'DADO_INCORRETO';
      else if (/\bvi[eé]s|discrimin|parcial/.test(lower)) incident_type = 'VIES';
      else if (/\bofens|inadequad|tom\s+|grosseir/.test(lower)) incident_type = 'COMPORTAMENTO_INADEQUADO';
      else incident_type = 'DADO_INCORRETO';
      return { hit: true, incident_type };
    }
  }
  return { hit: false, incident_type: 'UNKNOWN' };
}

/**
 * @param {string} userMessage
 * @param {object} [opts]
 * @param {string} [opts.assistantSummary]
 * @param {string} [opts.dataStateHint]
 * @param {string} [opts.lastAiTraceId]
 * @param {string} [opts.lastTraceCreatedAt]
 * @returns {Promise<{ is_complaint: boolean, incident_type: string, confidence: number, requires_hitl: boolean, data_state_hint?: string|null }>}
 */
async function evaluateComplaint(userMessage, opts = {}) {
  const text = String(userMessage || '').trim();
  const h = heuristicComplaint(text);

  const PROTEST_VERBS = /\b(errad|incorret|mentir|invent|alucin|fals|absurd|engana|engan)/i;
  const hasProtestVerb = PROTEST_VERBS.test(text);

  const hasRecentTrace = opts.lastAiTraceId && opts.lastTraceCreatedAt &&
    (Date.now() - new Date(opts.lastTraceCreatedAt).getTime()) <= 5 * 60 * 1000;

  const isTenantEmpty = opts.dataStateHint === 'tenant_empty';

  if (h.hit) {
    if (!hasProtestVerb && !hasRecentTrace) {
      return { is_complaint: false, incident_type: 'UNKNOWN', confidence: 0, requires_hitl: false };
    }
    return {
      is_complaint: true,
      incident_type: aiIncidentService.normType(h.incident_type),
      confidence: 88,
      requires_hitl: isTenantEmpty,
      data_state_hint: opts.dataStateHint || null
    };
  }

  if (!geminiService.isAvailable() || text.length < 12) {
    return { is_complaint: false, incident_type: 'UNKNOWN', confidence: 0, requires_hitl: false };
  }

  const parsed = await geminiService.classifyQualityComplaint(text, {
    assistantSummary: opts.assistantSummary,
    dataStateHint: opts.dataStateHint
  });
  if (!parsed) {
    return { is_complaint: false, incident_type: 'UNKNOWN', confidence: 0, requires_hitl: false };
  }
  const conf = typeof parsed.confidence === 'number' ? parsed.confidence : 0;
  const isComplaint = !!parsed.is_complaint && conf >= 80 && hasProtestVerb;
  return {
    is_complaint: isComplaint,
    incident_type: aiIncidentService.normType(parsed.incident_type),
    confidence: conf,
    requires_hitl: isComplaint && (isTenantEmpty || !opts.assistantSummary),
    data_state_hint: opts.dataStateHint || null
  };
}

module.exports = {
  evaluateComplaint,
  heuristicComplaint
};
