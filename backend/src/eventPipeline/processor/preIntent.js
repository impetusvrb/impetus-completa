'use strict';

/**
 * Pré-classificação leve de intenção, sem IA.
 *
 * Determinística, palavra-chave + tipo de evento. O Gemini posteriormente refina/eleva
 * confidence. Mantém-se simples para auditabilidade.
 */

const INTENTS = Object.freeze([
  'conversation',
  'analysis',
  'task',
  'external_data',
  'system_health'
]);

const KEYWORDS = {
  analysis: [
    /\b(an[áa]lise|relat[óo]rio|kpi|tend[êe]ncia|insight|pad[rr][õo]es?|hist[óo]rico)\b/i
  ],
  task: [/\b(criar?|abrir?|gerar?|registar?|registrar)\s+(tarefa|os|ordem)\b/i],
  external_data: [/\b(cota[çc][ãa]o|c[âa]mbio|clima|tempo|mercado|d[óo]lar|api externa)\b/i],
  system_health: [/\b(sistema|sa[úu]de|health|cpu|mem[óo]ria|uptime|servidor)\b/i]
};

/**
 * @param {object} args
 * @param {string} args.type — tipo do evento (envelope.type)
 * @param {string} [args.text] — summary/texto bruto pré-anonimização
 * @returns {{ intent_pre: 'conversation'|'analysis'|'task'|'external_data'|'system_health', confidence_pre: number }}
 */
function preClassifyIntent({ type, text }) {
  if (type === 'system_health_snapshot') {
    return { intent_pre: 'system_health', confidence_pre: 1 };
  }
  if (type === 'task_update') {
    return { intent_pre: 'task', confidence_pre: 0.8 };
  }
  if (type === 'sensor_alert') {
    return { intent_pre: 'analysis', confidence_pre: 0.7 };
  }
  if (type === 'external_data') {
    return { intent_pre: 'external_data', confidence_pre: 0.85 };
  }
  const t = (text || '').toString();
  for (const intent of ['analysis', 'task', 'external_data', 'system_health']) {
    if ((KEYWORDS[intent] || []).some((re) => re.test(t))) {
      return { intent_pre: intent, confidence_pre: 0.55 };
    }
  }
  return { intent_pre: 'conversation', confidence_pre: 0.5 };
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function extractEntitiesLite(text) {
  if (!text || typeof text !== 'string') return [];
  const entities = new Set();
  const idMatch = text.match(/\b([A-Z]{2,4}-?\d{2,6})\b/g);
  if (idMatch) idMatch.forEach((s) => entities.add(s));
  const machineMatch = text.match(/\bm[áa]quina\s+([\w\d-]+)/gi);
  if (machineMatch) machineMatch.forEach((s) => entities.add(s.trim()));
  return [...entities].slice(0, 10);
}

module.exports = {
  INTENTS,
  preClassifyIntent,
  extractEntitiesLite
};
