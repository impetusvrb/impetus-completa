'use strict';

const NLP_PATTERNS = Object.freeze({
  TASK: /(?:preciso|necessito|favor|por favor|pode|poderia|peço|solicito|precisamos)\s+(?:que|de|para|do|da)?\s*(.{5,120})/i,
  DEADLINE: /(?:até|antes de|prazo|deadline|entregar|data limite|amanh[aã](?:\s+[àa]s?\s*\d{1,2}\s*h(?:oras?)?)?|hoje(?:\s+[àa]s?\s*\d{1,2}\s*h(?:oras?)?)?)\s*[:.]?\s*(\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?|\d{1,2}\s*h(?:oras?)?|\d{1,2}:\d{2}|amanh[aã]|hoje|segunda|terça|quarta|quinta|sexta)?/i,
  REMINDER: /(?:me\s+lembr[ea]|não\s+esquec|lembrar|lembrete|avise[- ]me|alertar|remind)/i,
  URGENT: /(?:urgente|urgência|crítico|imediato|prioridade\s+máxima|emergência|parada|parou)/i,
  PENDING: /(?:pendente|pendência|falta|incompleto|não\s+foi\s+feito|aguardando)/i,
  REPORT: /(?:relatório|report|resumo|balanço|análise|diagnóstico|laudo|perdas)/i,
  ASSIGNEE: /(?:para\s+o\s+|para\s+a\s+|para\s+|responsável\s+|atribuir\s+a\s+|designar\s+|envie\s+para\s+|encaminhe\s+para\s+)([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*)/,
  COMMITMENT: /(?:prometo|vou\s+(?:preparar|fazer|entregar)|comprometo|garanto|me\s+comprometo|faço\s+isso|^ok\b|^certo\b)/i,
  SEND_DOC: /(?:envie|encaminhe|mande|prepare\s+e\s+envie|gere\s+e\s+envie)\s+(?:o?\s*(?:relatório|documento|laudo|pdf|arquivo))/i,
  SILENCE_BREAK: /^(ok|certo|entendido|recebido)$/i
});

function extractEntities(text) {
  if (!text || typeof text !== 'string') return {};
  const t = text.trim();
  const entities = {};
  for (const [key, pattern] of Object.entries(NLP_PATTERNS)) {
    const match = t.match(pattern);
    if (match) {
      entities[key.toLowerCase()] = {
        detected: true,
        match: (match[1] || match[0]).trim().slice(0, 200)
      };
    }
  }
  if (/amanh[aã]/i.test(t) && /\d{1,2}\s*h(?:oras?)?/i.test(t) && !entities.deadline) {
    entities.deadline = { detected: true, match: 'amanhã' };
  }
  return entities;
}

function parseDeadline(deadlineMatch, timeHint = null) {
  if (!deadlineMatch && !timeHint) return null;
  const raw = String(deadlineMatch || timeHint || '').toLowerCase().trim();
  const now = new Date();

  if (raw.includes('hoje') || raw === 'hoje') {
    now.setHours(18, 0, 0, 0);
    return now.toISOString();
  }
  if (raw.includes('amanhã') || raw === 'amanha') {
    now.setDate(now.getDate() + 1);
    now.setHours(14, 0, 0, 0);
    return now.toISOString();
  }

  const dayMap = { segunda: 1, terça: 2, quarta: 3, quinta: 4, sexta: 5 };
  for (const [name, day] of Object.entries(dayMap)) {
    if (raw.includes(name)) {
      const diff = (day - now.getDay() + 7) % 7 || 7;
      now.setDate(now.getDate() + diff);
      now.setHours(9, 0, 0, 0);
      return now.toISOString();
    }
  }

  const timeMatch = raw.match(/(\d{1,2})\s*h(?:oras?)?/);
  if (timeMatch) {
    now.setHours(parseInt(timeMatch[1], 10), 0, 0, 0);
    if (now < new Date()) now.setDate(now.getDate() + 1);
    return now.toISOString();
  }

  const clockMatch = raw.match(/(\d{1,2}):(\d{2})/);
  if (clockMatch) {
    now.setHours(parseInt(clockMatch[1], 10), parseInt(clockMatch[2], 10), 0, 0);
    if (now < new Date()) now.setDate(now.getDate() + 1);
    return now.toISOString();
  }

  const dateMatch = raw.match(/(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1;
    const year = dateMatch[3]
      ? (dateMatch[3].length === 2 ? 2000 + parseInt(dateMatch[3], 10) : parseInt(dateMatch[3], 10))
      : now.getFullYear();
    const d = new Date(year, month, day, 14, 0, 0);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  return null;
}

function classifyPriority(entities) {
  if (entities.urgent) return 'critica';
  if (entities.deadline || entities.risk) return 'alta';
  if (entities.task || entities.reminder || entities.pending || entities.commitment) return 'normal';
  return 'baixa';
}

function inferIntent(entities, content = '') {
  if (entities.task || entities.report) return 'task_request';
  if (entities.commitment) return 'commitment';
  if (entities.reminder) return 'reminder';
  if (entities.urgent) return 'urgency';
  if (entities.pending) return 'pending_followup';
  if (NLP_PATTERNS.SILENCE_BREAK.test(content.trim())) return 'acknowledgement';
  return 'informational';
}

function fuseThreadEntities(threadCtx = {}, newEntities = {}) {
  const fused = { ...(threadCtx.entities || {}) };
  for (const [k, v] of Object.entries(newEntities)) {
    if (v?.detected) fused[k] = v;
  }
  return fused;
}

module.exports = {
  NLP_PATTERNS,
  extractEntities,
  parseDeadline,
  classifyPriority,
  inferIntent,
  fuseThreadEntities
};
