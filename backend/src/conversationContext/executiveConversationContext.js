'use strict';

/**
 * CERT-VOICE-01 — Executive Conversation Context
 * Unifica subcontextos: meeting, presentation, briefing, strategic, boardroom.
 * Não altera permissões — apenas classificação de estilo conversacional.
 */

const EXECUTIVE_SUBCONTEXT_PATTERNS = Object.freeze({
  presentation: [
    /\bmodo\s+apresenta[çc][ãa]o\b/i,
    /\b(entrar|ativar)\s+(em\s+)?modo\s+apresenta[cç][ãa]o\b/i,
    /\b(vamos\s+)?(iniciar|começar)\s+(uma\s+)?apresenta[cç][ãa]o\b/i,
    /\b(apresente|apresentar|em\s+apresenta[çc][ãa]o)\b/i,
    /\bvou\s+apresentar\b/i,
    /\b(apresentar|apresente)\s+(estes\s+)?indicadores\b/i,
    /\bpreparar\s+(a\s+)?apresenta[cç][ãa]o\b/i,
    /\b(ocultar|esconder|omitir)\s+(dados\s+)?sens[ií]veis\b/i,
    /\bpara\s+(a\s+)?reuni[aã]o\s+com\s+(investidores|diretoria|conselho)\b/i
  ],
  meeting: [
    /\b(vamos\s+)?(iniciar|começar|entrar\s+em)\s+(uma\s+)?reuni[aã]o\b/i,
    /\bestou\s+em\s+reuni[aã]o\b/i,
    /\bem\s+reuni[aã]o\b/i,
    /\b(reuni[aã]o\s+com|na\s+reuni[aã]o)\b/i,
    /\bstand-?up\b/i,
    /\bvideoconfer[eê]ncia\b/i
  ],
  executive_briefing: [
    /\b(briefing|resumo\s+executivo|resumo\s+do\s+dia|panorama\s+do\s+dia)\b/i,
    /\b(preparar|montar)\s+(o\s+)?briefing\b/i,
    /\bo\s+que\s+preciso\s+saber\s+hoje\b/i
  ],
  strategic_analysis: [
    /\b(indicadores|kpi|situa[cç][ãa]o\s+da\s+empresa|vis[aã]o\s+geral)\b/i,
    /\b(resumo\s+da\s+produ[cç][ãa]o|performance\s+geral|desempenho\s+geral)\b/i,
    /\b(an[aá]lise\s+estrat[eé]gica|vis[aã]o\s+estrat[eé]gica)\b/i,
    /\bmaiores\s+riscos\b/i
  ],
  boardroom: [
    /\bboardroom\b/i,
    /\bcockpit\s+executivo\b/i,
    /\bsala\s+de\s+comando\s+executiv/i,
    /\bcentro\s+de\s+decis[aã]o\b/i
  ]
});

const EXECUTIVE_ROLE_HINTS = new Set([
  'ceo',
  'cfo',
  'diretor',
  'director_industrial',
  'director_general',
  'director_operations',
  'executive_director',
  'ceo_executive'
]);

function isExecutiveUser(user = {}) {
  const role = String(user.role || '').toLowerCase();
  const profile = String(user.dashboard_profile || '').toLowerCase();
  const hl = Number(user.hierarchy_level);
  if (role === 'ceo' || role === 'cfo') return true;
  if (EXECUTIVE_ROLE_HINTS.has(profile)) return true;
  if (profile.includes('ceo') || profile.includes('executive') || profile.includes('director')) return true;
  if (profile.includes('diretor') && !profile.includes('quality') && !profile.includes('environmental')) {
    return true;
  }
  if (Number.isFinite(hl) && hl <= 2) return true;
  return false;
}

/**
 * @param {string} queryText
 * @param {object} [opts]
 * @returns {{ subcontext: string|null, signals: string[], executive_domain: boolean }}
 */
function detectExecutiveSubcontext(queryText = '', opts = {}) {
  const t = String(queryText || '').trim();
  const signals = [];
  let subcontext = null;
  let bestPriority = -1;

  const priority = {
    presentation: 5,
    meeting: 4,
    boardroom: 3,
    executive_briefing: 2,
    strategic_analysis: 1
  };

  for (const [key, patterns] of Object.entries(EXECUTIVE_SUBCONTEXT_PATTERNS)) {
    for (const re of patterns) {
      if (re.test(t)) {
        signals.push(`executive:${key}`);
        if ((priority[key] || 0) > bestPriority) {
          bestPriority = priority[key];
          subcontext = key;
        }
        break;
      }
    }
  }

  if (!subcontext && (opts.modoApresentacao === true || opts.presentationContext?.enabled === true)) {
    subcontext = 'presentation';
    signals.push(
      opts.presentationContext?.enabled ? 'executive:presentation_context' : 'executive:presentation_flag'
    );
  }

  if (!subcontext && opts.executiveBoardroomActive === true && isExecutiveUser(opts.user)) {
    subcontext = 'boardroom';
    signals.push('executive:boardroom_runtime');
  }

  return {
    subcontext,
    signals,
    executive_domain: Boolean(subcontext) || isExecutiveUser(opts.user)
  };
}

module.exports = {
  EXECUTIVE_SUBCONTEXT_PATTERNS,
  isExecutiveUser,
  detectExecutiveSubcontext
};
