'use strict';

const { detectExecutiveSubcontext, isExecutiveUser } = require('./executiveConversationContext');

const OPERATIONAL_PATTERNS = [
  /\b(minhas?\s+)?tarefas?\b/i,
  /\babrir\s+os\b/i,
  /\bordem\s+de\s+servi[cç]o\b/i,
  /\bqual\s+m[aá]quina\b/i,
  /\bm[aá]quina\s+(parada|parou|est[aá]\s+parada)\b/i,
  /\bminha\s+equipe\b/i,
  /\bturno\b/i,
  /\binspe[cç][ãa]o\b/i,
  /\bapontamento\b/i,
  /\blinha\s+[a-z0-9]+\b/i
];

const TECHNICAL_PATTERNS = [
  /\b(como\s+)?substituir\b/i,
  /\brolamento\b/i,
  /\bdiagn[oó]stico\b/i,
  /\bmanu\s*ia\b/i,
  /\bmanuia\b/i,
  /\bprocedimento\b/i,
  /\bmanuten[cç][ãa]o\s+(preventiva|corretiva)\b/i,
  /\banalis(ar|e)\s+esta\s+m[aá]quina\b/i,
  /\btroubleshoot/i,
  /\besquema\b/i,
  /\bmanual\b/i
];

const EXECUTIVE_QUERY_PATTERNS = [
  /\bresumo\s+(geral|executivo|da\s+opera[cç][ãa]o)\b/i,
  /\bsetores?\s+com\s+(risco|pior)\b/i,
  /\bprodu[cç][ãa]o\s+da\s+semana\b/i,
  /\bprincipais\s+falhas\b/i,
  /\bpend[eê]ncias\s+cr[ií]ticas\b/i,
  /\bgargalos\b/i,
  /\bevolu[cç][ãa]o\s+semanal\b/i
];

/**
 * @param {string} queryText
 * @param {object} user
 * @param {object} [opts]
 * @returns {{ context_type: string, subcontext: string|null, confidence: number, signals: string[] }}
 */
function classifyConversationContext(queryText = '', user = {}, opts = {}) {
  const t = String(queryText || '').trim();
  const signals = [];
  const executive = detectExecutiveSubcontext(t, {
    user,
    modoApresentacao: opts.modoApresentacao,
    executiveBoardroomActive: opts.executiveBoardroomActive,
    presentationContext: opts.presentationContext
  });

  if (executive.subcontext) {
    return {
      context_type: 'executive',
      subcontext: executive.subcontext,
      profile_id: executive.subcontext,
      confidence: 0.88,
      signals: [...executive.signals]
    };
  }

  let operational = 0;
  let technical = 0;
  let executiveQuery = 0;

  for (const re of OPERATIONAL_PATTERNS) {
    if (re.test(t)) {
      operational += 1;
      signals.push(`operational:${re.source.slice(0, 20)}`);
    }
  }
  for (const re of TECHNICAL_PATTERNS) {
    if (re.test(t)) {
      technical += 1;
      signals.push(`technical:${re.source.slice(0, 20)}`);
    }
  }
  for (const re of EXECUTIVE_QUERY_PATTERNS) {
    if (re.test(t)) {
      executiveQuery += 1;
      signals.push(`executive_query:${re.source.slice(0, 20)}`);
    }
  }

  if (technical > 0 && technical >= operational) {
    return {
      context_type: 'technical',
      subcontext: null,
      profile_id: 'technical',
      confidence: Math.min(0.9, 0.55 + technical * 0.12),
      signals
    };
  }

  if (operational > 0) {
    return {
      context_type: 'operational',
      subcontext: null,
      profile_id: 'operational',
      confidence: Math.min(0.9, 0.55 + operational * 0.12),
      signals
    };
  }

  if (executiveQuery > 0 || isExecutiveUser(user)) {
    const profile_id = executiveQuery > 0 ? 'strategic_analysis' : 'executive';
    return {
      context_type: 'executive',
      subcontext: executiveQuery > 0 ? 'strategic_analysis' : null,
      profile_id,
      confidence: executiveQuery > 0 ? 0.72 : 0.58,
      signals: [...signals, ...(isExecutiveUser(user) ? ['user:executive_profile'] : [])]
    };
  }

  return {
    context_type: 'default',
    subcontext: null,
    profile_id: 'default',
    confidence: t.length >= 6 ? 0.5 : 0.35,
    signals: signals.length ? signals : ['default']
  };
}

module.exports = {
  classifyConversationContext
};
