'use strict';

const geminiService = require('./geminiService');
const aiIncidentService = require('./aiIncidentService');

/** Padrões fortes (PT-BR) — evita chamada ao modelo quando a intenção é óbvia. */
const STRONG_COMPLAINT_PATTERNS = [
  /\b(isso|isto)\s+(está|ta)\s+errad/i,
  /\bvoce|você|tu\b.{0,40}\b(invent|mentir|alucin|fantasi)/i,
  /\b(inventando|inventou)\s+dados/i,
  /\binformac(ao|ão)\s+n[aã]o\s+confere/i,
  /\bnao\s+confere|não\s+confere/i,
  /\bestá\s+errado|esta\s+errado|tá\s+errado/i,
  /\bdado[s]?\s+(errad|incorret|fals)/i,
  /\balucinac(ao|ão)\b/i,
  /\bresposta\s+(errad|incorret|absurd)/i,
  /\b(isso|isto)\s+n[aã]o\s+bate\b/i,
  /\bcompletamente\s+errad/i
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
 * @returns {Promise<{ is_complaint: boolean, incident_type: string, confidence: number }>}
 */
async function evaluateComplaint(userMessage) {
  const text = String(userMessage || '').trim();
  const h = heuristicComplaint(text);
  if (h.hit) {
    return {
      is_complaint: true,
      incident_type: aiIncidentService.normType(h.incident_type),
      confidence: 88
    };
  }

  if (!geminiService.isAvailable() || text.length < 12) {
    return { is_complaint: false, incident_type: 'UNKNOWN', confidence: 0 };
  }

  const parsed = await geminiService.classifyQualityComplaint(text);
  if (!parsed) {
    return { is_complaint: false, incident_type: 'UNKNOWN', confidence: 0 };
  }
  const conf = typeof parsed.confidence === 'number' ? parsed.confidence : 0;
  const isComplaint = !!parsed.is_complaint && conf >= 58;
  return {
    is_complaint: isComplaint,
    incident_type: aiIncidentService.normType(parsed.incident_type),
    confidence: conf
  };
}

module.exports = {
  evaluateComplaint,
  heuristicComplaint
};
